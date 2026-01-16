import {SubmissionEntity, Answer} from '@core/entities/Submission';
import {ISubmissionRepository} from '@core/repositories/ISubmissionRepository';
import {apiClient} from '@data/api/apiClient';

interface FetchResult {
  fetchedCount: number;
  updatedCount: number;
  errors: Array<{submissionId: string; error: string}>;
}

export class FetchRemoteSubmissionsUseCase {
  constructor(private submissionRepository: ISubmissionRepository) {}

  async execute(): Promise<FetchResult> {
    const result: FetchResult = {
      fetchedCount: 0,
      updatedCount: 0,
      errors: [],
    };

    try {
      console.log('[FetchRemoteSubmissionsUseCase] Fetching submissions from server...');

      // Get all submissions from server (admin can see all)
      const remoteSubmissions = await apiClient.getSubmissions();

      console.log(
        `[FetchRemoteSubmissionsUseCase] Found ${remoteSubmissions.length} remote submissions`,
      );

      for (const remoteSubmission of remoteSubmissions) {
        try {
          // Check if submission already exists locally
          const existingSubmission = await this.submissionRepository.findById(
            remoteSubmission.id,
          );

          if (existingSubmission) {
            // Skip if already synced (don't overwrite local changes)
            if (existingSubmission.syncStatus === 'synced') {
              console.log(
                `[FetchRemoteSubmissionsUseCase] Submission ${remoteSubmission.id} already synced, skipping`,
              );
              continue;
            }
            result.updatedCount++;
          } else {
            // Create new local submission from remote data
            const answers: Answer[] = remoteSubmission.answers?.map((a: any) => ({
              questionId: a.questionId,
              value: a.answerText || a.answerValue || null,
            })) || [];

            const submission = new SubmissionEntity(
              remoteSubmission.id,
              remoteSubmission.formId,
              remoteSubmission.userId,
              answers,
              remoteSubmission.metadata || null,
              new Date(remoteSubmission.startedAt),
              remoteSubmission.completedAt ? new Date(remoteSubmission.completedAt) : null,
              'synced', // Mark as synced since it came from server
              new Date(), // syncedAt
              new Date(remoteSubmission.createdAt),
              new Date(remoteSubmission.updatedAt),
            );

            await this.submissionRepository.create(submission);
            result.fetchedCount++;

            console.log(
              `[FetchRemoteSubmissionsUseCase] Created local submission: ${remoteSubmission.id}`,
            );
          }
        } catch (error: any) {
          console.error(
            `[FetchRemoteSubmissionsUseCase] Error processing submission ${remoteSubmission.id}:`,
            error,
          );
          result.errors.push({
            submissionId: remoteSubmission.id,
            error: error.message || 'Failed to process submission',
          });
        }
      }

      console.log('[FetchRemoteSubmissionsUseCase] Fetch completed:', result);

      return result;
    } catch (error: any) {
      console.error('[FetchRemoteSubmissionsUseCase] Fatal error:', error);
      throw new Error(error.message || 'Failed to fetch remote submissions');
    }
  }
}
