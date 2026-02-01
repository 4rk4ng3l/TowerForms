import {SubmissionEntity, Answer} from '@core/entities/Submission';
import {FileEntity} from '@core/entities/File';
import {ISubmissionRepository} from '@core/repositories/ISubmissionRepository';
import {IFileRepository} from '@core/repositories/IFileRepository';
import {apiClient} from '@data/api/apiClient';
import {generateUUID} from '@shared/utils/idGenerator';
import {Paths, Directory, File} from 'expo-file-system/next';

interface SyncResult {
  syncedCount: number;
  failedCount: number;
  filesUploaded: number;
  filesFailed: number;
  errors: Array<{submissionId: string; error: string}>;
}

interface SyncProgressCallback {
  onSubmissionProgress?: (current: number, total: number, submissionId: string) => void;
  onFileProgress?: (current: number, total: number, fileName: string) => void;
}

interface DownloadResult {
  downloadedSubmissions: number;
  downloadedFiles: number;
  failedFiles: number;
  errors: Array<{submissionId?: string; fileId?: string; error: string}>;
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
    answerComment?: string;
  }>;
  files: Array<{
    id: string;
    stepId: string;
    questionId?: string;
    fileName: string;
    mimeType: string;
    fileSize: number;
  }>; // Note: fileData removed - files are uploaded separately
}

interface FileUploadInfo {
  submissionId: string;
  stepId: string;
  questionId?: string;
  fileId: string;
  localPath: string;
  fileName: string;
  mimeType: string;
}

export class SyncSubmissionsUseCase {
  private static readonly FILE_BATCH_SIZE = 5; // Upload 5 files at a time

  constructor(
    private submissionRepository: ISubmissionRepository,
    private fileRepository: IFileRepository,
  ) {}

  async execute(progressCallback?: SyncProgressCallback): Promise<SyncResult> {
    const result: SyncResult = {
      syncedCount: 0,
      failedCount: 0,
      filesUploaded: 0,
      filesFailed: 0,
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
        console.log('[SyncSubmissionsUseCase] No unsynced submissions found. Exiting.');
        return result;
      }

      console.log(
        '[SyncSubmissionsUseCase] Unsynced submission IDs:',
        unsyncedSubmissions.map(s => s.id),
      );

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

      // Collect all files to upload
      const allFilesToUpload: FileUploadInfo[] = [];

      // Convert submissions to DTOs (without file data)
      const submissionDtos: SyncSubmissionDto[] = [];
      const failedMappingIds = new Set<string>();

      for (const submission of unsyncedSubmissions) {
        try {
          const {dto, filesToUpload} = await this.mapSubmissionToDtoWithFiles(submission);
          submissionDtos.push(dto);
          allFilesToUpload.push(...filesToUpload);
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

      // STEP 1: Sync submission metadata first (without file data)
      if (submissionDtos.length > 0) {
        try {
          console.log(
            `[SyncSubmissionsUseCase] Syncing ${submissionDtos.length} submissions (metadata only)...`,
          );
          console.log(
            '[SyncSubmissionsUseCase] Submission DTOs summary:',
            submissionDtos.map(dto => ({
              id: dto.id,
              formId: dto.formId,
              answerCount: dto.answers.length,
              fileCount: dto.files.length,
            })),
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
              // Remove files for this submission from upload queue
              const submissionFileIds = new Set(
                allFilesToUpload
                  .filter(f => f.submissionId === submission.id)
                  .map(f => f.fileId),
              );
              allFilesToUpload.splice(
                0,
                allFilesToUpload.length,
                ...allFilesToUpload.filter(f => !submissionFileIds.has(f.fileId)),
              );
            } else {
              result.syncedCount++;
              // Don't mark as fully synced yet - still need to upload files
            }

            progressCallback?.onSubmissionProgress?.(
              result.syncedCount + result.failedCount,
              unsyncedSubmissions.length,
              submission.id,
            );
          }
        } catch (error: any) {
          console.error('[SyncSubmissionsUseCase] Submission sync failed:', error);

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
          // Clear file upload queue since submissions failed
          allFilesToUpload.length = 0;
        }
      }

      // STEP 2: Upload files in batches
      if (allFilesToUpload.length > 0) {
        console.log(
          `[SyncSubmissionsUseCase] Uploading ${allFilesToUpload.length} files in batches of ${SyncSubmissionsUseCase.FILE_BATCH_SIZE}...`,
        );

        const fileUploadResult = await apiClient.uploadFilesInBatches(
          allFilesToUpload,
          SyncSubmissionsUseCase.FILE_BATCH_SIZE,
          (completed, total, currentFile) => {
            progressCallback?.onFileProgress?.(completed, total, currentFile);
          },
        );

        result.filesUploaded = fileUploadResult.uploaded;
        result.filesFailed = fileUploadResult.failed;

        console.log(
          `[SyncSubmissionsUseCase] File upload complete: ${result.filesUploaded} uploaded, ${result.filesFailed} failed`,
        );

        // Mark successfully uploaded files as synced
        for (const fileId of fileUploadResult.successIds) {
          try {
            await this.fileRepository.markAsSynced(fileId, ''); // remotePath will be set by backend
            console.log(`[SyncSubmissionsUseCase] Marked file ${fileId} as synced`);
          } catch (err) {
            console.error(`[SyncSubmissionsUseCase] Failed to mark file ${fileId} as synced:`, err);
          }
        }

        // Mark failed files as failed
        for (const fileError of fileUploadResult.errors) {
          try {
            await this.fileRepository.markAsFailed(fileError.fileId);
            console.error(
              `[SyncSubmissionsUseCase] File upload failed: ${fileError.fileName} - ${fileError.error}`,
            );
          } catch (err) {
            console.error(`[SyncSubmissionsUseCase] Failed to mark file ${fileError.fileId} as failed:`, err);
          }
        }

        // Check if all files for each submission are synced
        for (const submission of unsyncedSubmissions) {
          if (failedMappingIds.has(submission.id)) {
            continue;
          }

          // Get all files for this submission
          const submissionFiles = await this.fileRepository.findBySubmissionId(submission.id);
          const allFilesSynced = submissionFiles.every(f => f.syncStatus === 'synced');

          if (allFilesSynced) {
            await this.submissionRepository.update(submission.markAsSynced());
            console.log(`[SyncSubmissionsUseCase] Submission ${submission.id} fully synced`);
          } else {
            // Keep in pending state so it can be retried
            const pendingCount = submissionFiles.filter(f => f.syncStatus !== 'synced').length;
            console.log(`[SyncSubmissionsUseCase] Submission ${submission.id} has ${pendingCount} files pending`);
          }
        }
      } else {
        // No files to upload - mark successful submissions as synced
        for (const submission of unsyncedSubmissions) {
          if (!failedMappingIds.has(submission.id)) {
            const hasError = result.errors.some(e => e.submissionId === submission.id);
            if (!hasError) {
              await this.submissionRepository.update(
                submission.markAsSynced(),
              );
            }
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

  /**
   * Maps a submission to DTO format and extracts file upload info
   * Files are not converted to base64 here - they will be uploaded separately
   */
  private async mapSubmissionToDtoWithFiles(
    submission: SubmissionEntity,
  ): Promise<{dto: SyncSubmissionDto; filesToUpload: FileUploadInfo[]}> {
    // Load files for this submission
    const files = await this.fileRepository.findBySubmissionId(submission.id);

    console.log(`[SyncSubmissionsUseCase] Found ${files.length} files for submission ${submission.id}`);
    console.log('[SyncSubmissionsUseCase] Files:', files.map(f => ({ id: f.id, fileName: f.fileName, localPath: f.localPath })));

    // Extract file metadata for DTO (without file data)
    const fileDtos = files.map(file => ({
      id: file.id,
      stepId: file.stepId,
      questionId: file.questionId || undefined,
      fileName: file.fileName,
      mimeType: file.mimeType,
      fileSize: file.fileSize,
    }));

    // Prepare files for batch upload - only pending or failed files
    const filesToUpload: FileUploadInfo[] = files
      .filter(file => file.localPath && file.syncStatus !== 'synced') // Skip already synced
      .map(file => ({
        submissionId: submission.id,
        stepId: file.stepId,
        questionId: file.questionId || undefined,
        fileId: file.id,
        localPath: file.localPath!,
        fileName: file.fileName,
        mimeType: file.mimeType,
      }));

    console.log(`[SyncSubmissionsUseCase] Prepared ${filesToUpload.length} files for upload`);

    // Map answers to backend format
    const answerDtos = submission.answers.map((answer) => {
      // Generate a UUID for the answer
      const answerId = generateUUID();

      // Base answer object with comment if present
      const baseAnswer = {
        id: answerId,
        questionId: answer.questionId,
        ...(answer.comment ? { answerComment: answer.comment } : {}),
      };

      // Determine if answer is text or multiple choice
      if (Array.isArray(answer.value)) {
        // Multiple choice - use answerValue
        return {
          ...baseAnswer,
          answerValue: answer.value,
        };
      } else {
        // Text or number - use answerText
        const textValue =
          answer.value !== null && answer.value !== undefined
            ? String(answer.value)
            : '';
        return {
          ...baseAnswer,
          answerText: textValue,
        };
      }
    });

    const dto: SyncSubmissionDto = {
      id: submission.id,
      formId: submission.formId,
      userId: submission.userId,
      metadata: submission.metadata || undefined,
      startedAt: submission.startedAt.toISOString(),
      completedAt: submission.completedAt?.toISOString(),
      answers: answerDtos,
      files: fileDtos,
    };

    return {dto, filesToUpload};
  }

  /**
   * Downloads pending submissions and their files from the server
   * Saves them locally for offline access
   */
  async downloadFromServer(
    userId: string,
    lastSyncDate?: string,
    progressCallback?: SyncProgressCallback,
  ): Promise<DownloadResult> {
    const result: DownloadResult = {
      downloadedSubmissions: 0,
      downloadedFiles: 0,
      failedFiles: 0,
      errors: [],
    };

    try {
      console.log('[SyncSubmissionsUseCase] Downloading pending data from server...');

      // Get pending data from server
      const pendingData = await apiClient.getPendingData({
        userId,
        lastSyncDate,
      });

      console.log('[SyncSubmissionsUseCase] Pending data received:', {
        submissions: pendingData.count.submissions,
        files: pendingData.count.files,
      });

      if (pendingData.submissions.length === 0) {
        console.log('[SyncSubmissionsUseCase] No pending submissions to download.');
        return result;
      }

      // Create files directory if it doesn't exist
      const filesDir = new Directory(Paths.document, 'towerforms_files');
      if (!filesDir.exists) {
        await filesDir.create();
        console.log('[SyncSubmissionsUseCase] Created files directory');
      }

      // Process each submission
      for (const serverSubmission of pendingData.submissions) {
        try {
          // Check if submission already exists locally
          const existingSubmission = await this.submissionRepository.findById(
            serverSubmission.id,
          );

          if (existingSubmission) {
            console.log(
              `[SyncSubmissionsUseCase] Submission ${serverSubmission.id} already exists locally, skipping`,
            );
            continue;
          }

          // Map server answers to local format
          const answers: Answer[] = (serverSubmission.answers || []).map((a: any) => ({
            questionId: a.questionId,
            value: a.answerValue || a.answerText || null,
            comment: a.answerComment || null,
            fileIds: [],
          }));

          // Create local submission entity
          const submission = new SubmissionEntity(
            serverSubmission.id,
            serverSubmission.formId,
            serverSubmission.userId,
            answers,
            serverSubmission.metadata || null,
            new Date(serverSubmission.startedAt),
            serverSubmission.completedAt ? new Date(serverSubmission.completedAt) : null,
            'synced', // Already synced since it came from server
            new Date(), // syncedAt
            new Date(serverSubmission.createdAt || serverSubmission.startedAt),
            new Date(serverSubmission.updatedAt || serverSubmission.startedAt),
          );

          // Save submission locally
          await this.submissionRepository.create(submission);
          result.downloadedSubmissions++;

          console.log(
            `[SyncSubmissionsUseCase] Created local submission: ${submission.id}`,
          );

          progressCallback?.onSubmissionProgress?.(
            result.downloadedSubmissions,
            pendingData.submissions.length,
            submission.id,
          );
        } catch (error: any) {
          console.error(
            `[SyncSubmissionsUseCase] Error creating submission ${serverSubmission.id}:`,
            error,
          );
          result.errors.push({
            submissionId: serverSubmission.id,
            error: error.message || 'Failed to create local submission',
          });
        }
      }

      // Download files
      if (pendingData.files && pendingData.files.length > 0) {
        console.log(
          `[SyncSubmissionsUseCase] Downloading ${pendingData.files.length} files...`,
        );

        const fileIds = pendingData.files.map((f: any) => f.id);

        const downloadResult = await apiClient.downloadFilesInBatches(
          fileIds,
          3, // Download 3 files at a time
          (completed, total, currentFileId) => {
            progressCallback?.onFileProgress?.(completed, total, currentFileId);
          },
        );

        // Save downloaded files locally
        for (const downloadedFile of downloadResult.results) {
          try {
            // Find the file metadata from pending data
            const fileMetadata = pendingData.files.find(
              (f: any) => f.id === downloadedFile.fileId,
            );

            if (!fileMetadata) {
              console.error(
                `[SyncSubmissionsUseCase] File metadata not found for ${downloadedFile.fileId}`,
              );
              continue;
            }

            // Check if file already exists locally
            const existingFile = await this.fileRepository.findById(downloadedFile.fileId);
            if (existingFile) {
              console.log(
                `[SyncSubmissionsUseCase] File ${downloadedFile.fileId} already exists locally, skipping`,
              );
              continue;
            }

            // Save file to local storage
            const destFileName = `${downloadedFile.fileId}_${downloadedFile.fileName}`;
            const destFile = new File(filesDir, destFileName);
            const localPath = destFile.uri;

            // Write ArrayBuffer to file
            const uint8Array = new Uint8Array(downloadedFile.data);
            await destFile.write(uint8Array);

            console.log(
              `[SyncSubmissionsUseCase] File saved to: ${localPath}`,
            );

            // Create file entity
            const fileEntity = new FileEntity(
              downloadedFile.fileId,
              fileMetadata.submissionId,
              fileMetadata.stepId || '',
              fileMetadata.questionId || null,
              localPath,
              fileMetadata.remotePath || null,
              downloadedFile.fileName,
              fileMetadata.fileSize || uint8Array.length,
              downloadedFile.mimeType,
              'synced', // Already synced since downloaded from server
              new Date(fileMetadata.createdAt || new Date()),
            );

            // Save file entity to database
            await this.fileRepository.create(fileEntity);
            result.downloadedFiles++;

            console.log(
              `[SyncSubmissionsUseCase] Created local file entity: ${fileEntity.id}`,
            );
          } catch (error: any) {
            console.error(
              `[SyncSubmissionsUseCase] Error saving file ${downloadedFile.fileId}:`,
              error,
            );
            result.failedFiles++;
            result.errors.push({
              fileId: downloadedFile.fileId,
              error: error.message || 'Failed to save file locally',
            });
          }
        }

        // Record failed downloads
        for (const fileError of downloadResult.errors) {
          result.failedFiles++;
          result.errors.push({
            fileId: fileError.fileId,
            error: fileError.error,
          });
        }
      }

      console.log('[SyncSubmissionsUseCase] Download completed:', result);

      return result;
    } catch (error: any) {
      console.error('[SyncSubmissionsUseCase] Fatal error during download:', error);
      throw new Error(error.message || 'Failed to download from server');
    }
  }
}
