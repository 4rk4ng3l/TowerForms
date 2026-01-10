import {SubmissionEntity, SubmissionMetadata} from '@core/entities/Submission';
import {ISubmissionRepository} from '@core/repositories/ISubmissionRepository';

export class UpdateSubmissionMetadataUseCase {
  constructor(private submissionRepository: ISubmissionRepository) {}

  async execute(
    submissionId: string,
    metadata: Partial<SubmissionMetadata>,
  ): Promise<SubmissionEntity> {
    try {
      console.log('[UpdateSubmissionMetadataUseCase] Updating metadata for submission:', submissionId);

      // Get existing submission
      const submission = await this.submissionRepository.findById(submissionId);

      if (!submission) {
        throw new Error('Submission not found');
      }

      // Update metadata
      const updatedSubmission = submission.updateMetadata(metadata);

      // Save to database
      await this.submissionRepository.update(updatedSubmission);

      console.log('[UpdateSubmissionMetadataUseCase] Metadata updated:', submissionId);

      return updatedSubmission;
    } catch (error: any) {
      console.error('[UpdateSubmissionMetadataUseCase] Error updating metadata:', error);
      throw new Error(error.message || 'Failed to update metadata');
    }
  }
}
