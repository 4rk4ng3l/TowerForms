import {SubmissionEntity} from '@core/entities/Submission';
import {FileEntity} from '@core/entities/File';
import {ISubmissionRepository} from '@core/repositories/ISubmissionRepository';
import {IFileRepository} from '@core/repositories/IFileRepository';
import {apiClient} from '@data/api/apiClient';
import * as FileSystem from 'expo-file-system';

interface SyncResult {
  syncedCount: number;
  failedCount: number;
  errors: Array<{submissionId: string; error: string}>;
}

interface SyncSubmissionDto {
  id: string;
  formId: string;
  userId: string;
  metadata?: Record<string, any>;
  startedAt: string;
  completedAt?: string;
  answers: Array<{
    id: string;
    questionId: string;
    answerText?: string;
    answerValue?: string[];
  }>;
  files: Array<{
    id: string;
    stepId: string;
    questionId?: string;
    fileName: string;
    fileData: string; // Base64 encoded file
    mimeType: string;
    fileSize: number;
  }>;
}

export class SyncSubmissionsUseCase {
  constructor(
    private submissionRepository: ISubmissionRepository,
    private fileRepository: IFileRepository,
  ) {}

  async execute(): Promise<SyncResult> {
    const result: SyncResult = {
      syncedCount: 0,
      failedCount: 0,
      errors: [],
    };

    try {
      console.log('[SyncSubmissionsUseCase] Starting sync...');

      // Get all unsynced submissions
      const unsyncedSubmissions =
        await this.submissionRepository.findUnsynced();

      console.log(
        `[SyncSubmissionsUseCase] Found ${unsyncedSubmissions.length} unsynced submissions`,
      );

      if (unsyncedSubmissions.length === 0) {
        return result;
      }

      // Mark submissions as syncing
      for (const submission of unsyncedSubmissions) {
        await this.submissionRepository.update(
          new SubmissionEntity(
            submission.id,
            submission.formId,
            submission.userId,
            submission.answers,
            submission.metadata,
            submission.startedAt,
            submission.completedAt,
            'syncing', // Mark as syncing
            submission.syncedAt,
            submission.createdAt,
            new Date(),
          ),
        );
      }

      // Convert submissions to DTOs
      const submissionDtos: SyncSubmissionDto[] = [];
      const failedMappingIds = new Set<string>();

      for (const submission of unsyncedSubmissions) {
        try {
          const dto = await this.mapSubmissionToDto(submission);
          submissionDtos.push(dto);
        } catch (error: any) {
          console.error(
            `[SyncSubmissionsUseCase] Error mapping submission ${submission.id}:`,
            error,
          );
          result.errors.push({
            submissionId: submission.id,
            error: error.message || 'Failed to prepare submission for sync',
          });
          result.failedCount++;

          // Mark submission as failed
          await this.submissionRepository.update(submission.markAsFailed());
          failedMappingIds.add(submission.id);
        }
      }

      // Sync to backend
      if (submissionDtos.length > 0) {
        try {
          console.log(
            `[SyncSubmissionsUseCase] Syncing ${submissionDtos.length} submissions to backend...`,
          );

          const syncResponse = await apiClient.syncSubmissions(submissionDtos);

          console.log('[SyncSubmissionsUseCase] Sync response:', syncResponse);

          // Update sync status based on response - only for submissions that were actually sent
          for (const submission of unsyncedSubmissions) {
            // Skip submissions that failed during mapping
            if (failedMappingIds.has(submission.id)) {
              continue;
            }

            const error = syncResponse.errors.find(
              e => e.submissionId === submission.id,
            );

            if (error) {
              // Mark as failed
              await this.submissionRepository.update(
                submission.markAsFailed(),
              );
              result.failedCount++;
              result.errors.push({
                submissionId: submission.id,
                error: error.error,
              });
            } else {
              // Mark as synced
              await this.submissionRepository.update(
                submission.markAsSynced(),
              );
              result.syncedCount++;
            }
          }
        } catch (error: any) {
          console.error('[SyncSubmissionsUseCase] Sync failed:', error);

          // Mark all submissions as failed
          for (const submission of unsyncedSubmissions) {
            await this.submissionRepository.update(submission.markAsFailed());
            result.failedCount++;
            result.errors.push({
              submissionId: submission.id,
              error:
                error.response?.data?.error?.message ||
                error.message ||
                'Sync failed',
            });
          }
        }
      }

      console.log('[SyncSubmissionsUseCase] Sync completed:', result);

      return result;
    } catch (error: any) {
      console.error('[SyncSubmissionsUseCase] Fatal error during sync:', error);
      throw new Error(error.message || 'Failed to sync submissions');
    }
  }

  private async mapSubmissionToDto(
    submission: SubmissionEntity,
  ): Promise<SyncSubmissionDto> {
    // Load files for this submission
    const files = await this.fileRepository.findBySubmissionId(submission.id);

    // Convert files to base64
    const fileDtos = await Promise.all(
      files.map(file => this.mapFileToDto(file)),
    );

    // Map answers to backend format
    const answerDtos = submission.answers.map((answer, index) => {
      const answerId = `${submission.id}-${answer.questionId}`;

      // Determine if answer is text or multiple choice
      if (Array.isArray(answer.value)) {
        // Multiple choice - use answerValue
        return {
          id: answerId,
          questionId: answer.questionId,
          answerValue: answer.value,
        };
      } else {
        // Text or number - use answerText
        const textValue =
          answer.value !== null && answer.value !== undefined
            ? String(answer.value)
            : '';
        return {
          id: answerId,
          questionId: answer.questionId,
          answerText: textValue,
        };
      }
    });

    return {
      id: submission.id,
      formId: submission.formId,
      userId: submission.userId,
      metadata: submission.metadata || undefined,
      startedAt: submission.startedAt.toISOString(),
      completedAt: submission.completedAt?.toISOString(),
      answers: answerDtos,
      files: fileDtos,
    };
  }

  private async mapFileToDto(file: FileEntity): Promise<{
    id: string;
    stepId: string;
    questionId?: string;
    fileName: string;
    fileData: string;
    mimeType: string;
    fileSize: number;
  }> {
    // Read file from local path and convert to base64
    if (!file.localPath) {
      throw new Error(`File ${file.id} (${file.fileName}) has no local path`);
    }

    try {
      // Check if file exists before attempting to read
      const fileInfo = await FileSystem.getInfoAsync(file.localPath);

      if (!fileInfo.exists) {
        throw new Error(`File not found at path: ${file.localPath}`);
      }

      if (!fileInfo.isDirectory) {
        // Read file as base64
        const base64Data = await FileSystem.readAsStringAsync(file.localPath, {
          encoding: FileSystem.EncodingType.Base64,
        });

        console.log(
          `[SyncSubmissionsUseCase] Successfully read file ${file.fileName} (${(base64Data.length / 1024).toFixed(2)} KB base64)`,
        );

        return {
          id: file.id,
          stepId: file.stepId,
          questionId: file.questionId || undefined,
          fileName: file.fileName,
          fileData: base64Data,
          mimeType: file.mimeType,
          fileSize: file.fileSize,
        };
      } else {
        throw new Error(`Path is a directory, not a file: ${file.localPath}`);
      }
    } catch (error: any) {
      console.error(
        `[SyncSubmissionsUseCase] Error reading file ${file.id} (${file.fileName}):`,
        error,
      );
      throw new Error(
        `Failed to read file ${file.fileName}: ${error.message || 'Unknown error'}`,
      );
    }
  }
}
