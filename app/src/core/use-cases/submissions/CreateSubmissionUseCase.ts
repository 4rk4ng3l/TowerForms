import {SubmissionEntity, SubmissionMetadata} from '@core/entities/Submission';
import {ISubmissionRepository} from '@core/repositories/ISubmissionRepository';
import {generateUUID} from '@shared/utils/idGenerator';

export class CreateSubmissionUseCase {
  constructor(private submissionRepository: ISubmissionRepository) {}

  async execute(
    formId: string,
    userId: string,
    metadata?: Partial<SubmissionMetadata>,
  ): Promise<SubmissionEntity> {
    try {
      console.log('[CreateSubmissionUseCase] Creating submission for form:', formId);

      // Generate unique UUID
      const submissionId = generateUUID();

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
