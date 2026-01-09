import {SubmissionEntity, Answer} from '@core/entities/Submission';
import {ISubmissionRepository} from '@core/repositories/ISubmissionRepository';

export class UpdateSubmissionUseCase {
  constructor(private submissionRepository: ISubmissionRepository) {}

  async execute(
    submissionId: string,
    answer: Answer,
  ): Promise<SubmissionEntity> {
    try {
      console.log('[UpdateSubmissionUseCase] Updating submission:', submissionId);

      // Get existing submission
      const submission = await this.submissionRepository.findById(submissionId);

      if (!submission) {
        throw new Error('Submission not found');
      }

      // Add/update answer
      const updatedSubmission = submission.addAnswer(answer);

      // Save to database
      await this.submissionRepository.update(updatedSubmission);

      console.log('[UpdateSubmissionUseCase] Submission updated:', submissionId);

      return updatedSubmission;
    } catch (error: any) {
      console.error('[UpdateSubmissionUseCase] Error updating submission:', error);
      throw new Error(error.message || 'Failed to update submission');
    }
  }

  async updateAnswer(submissionId: string, answer: Answer): Promise<void> {
    try {
      console.log('[UpdateSubmissionUseCase] Updating answer for submission:', submissionId);

      await this.submissionRepository.updateAnswer(submissionId, answer);

      console.log('[UpdateSubmissionUseCase] Answer updated');
    } catch (error: any) {
      console.error('[UpdateSubmissionUseCase] Error updating answer:', error);
      throw new Error('Failed to update answer');
    }
  }
}
