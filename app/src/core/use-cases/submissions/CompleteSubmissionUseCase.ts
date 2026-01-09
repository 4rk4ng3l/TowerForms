import {SubmissionEntity} from '@core/entities/Submission';
import {ISubmissionRepository} from '@core/repositories/ISubmissionRepository';

export class CompleteSubmissionUseCase {
  constructor(private submissionRepository: ISubmissionRepository) {}

  async execute(submissionId: string): Promise<SubmissionEntity> {
    try {
      console.log('[CompleteSubmissionUseCase] Completing submission:', submissionId);

      // Get existing submission
      const submission = await this.submissionRepository.findById(submissionId);

      if (!submission) {
        throw new Error('Submission not found');
      }

      // Mark as completed
      const completedSubmission = submission.complete();

      // Save to database
      await this.submissionRepository.update(completedSubmission);

      console.log('[CompleteSubmissionUseCase] Submission completed:', submissionId);

      return completedSubmission;
    } catch (error: any) {
      console.error('[CompleteSubmissionUseCase] Error completing submission:', error);
      throw new Error(error.message || 'Failed to complete submission');
    }
  }
}
