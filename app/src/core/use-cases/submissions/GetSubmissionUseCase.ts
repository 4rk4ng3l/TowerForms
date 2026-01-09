import {SubmissionEntity} from '@core/entities/Submission';
import {ISubmissionRepository} from '@core/repositories/ISubmissionRepository';

export class GetSubmissionUseCase {
  constructor(private submissionRepository: ISubmissionRepository) {}

  async execute(submissionId: string): Promise<SubmissionEntity | null> {
    try {
      console.log('[GetSubmissionUseCase] Fetching submission:', submissionId);

      const submission = await this.submissionRepository.findById(submissionId);

      if (!submission) {
        console.log('[GetSubmissionUseCase] Submission not found');
        return null;
      }

      console.log('[GetSubmissionUseCase] Found submission:', submission.id);

      return submission;
    } catch (error: any) {
      console.error('[GetSubmissionUseCase] Error fetching submission:', error);
      throw new Error('Failed to load submission');
    }
  }
}
