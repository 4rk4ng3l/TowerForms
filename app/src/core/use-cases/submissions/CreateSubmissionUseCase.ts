import {SubmissionEntity, SubmissionMetadata} from '@core/entities/Submission';
import {ISubmissionRepository} from '@core/repositories/ISubmissionRepository';

export class CreateSubmissionUseCase {
  constructor(private submissionRepository: ISubmissionRepository) {}

  async execute(
    formId: string,
    userId: string,
    metadata?: Partial<SubmissionMetadata>,
  ): Promise<SubmissionEntity> {
    try {
      console.log('[CreateSubmissionUseCase] Creating submission for form:', formId);

      // Generate unique ID
      const submissionId = `submission-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;

      // Create submission entity
      const submission = SubmissionEntity.create(
        submissionId,
        formId,
        userId,
        metadata,
      );

      // Save to database
      await this.submissionRepository.create(submission);

      console.log('[CreateSubmissionUseCase] Submission created:', submissionId);

      return submission;
    } catch (error: any) {
      console.error('[CreateSubmissionUseCase] Error creating submission:', error);
      throw new Error('Failed to create submission');
    }
  }
}
