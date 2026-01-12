import {ISubmissionRepository} from '../../repositories/ISubmissionRepository';
import {SubmissionEntity} from '../../entities/Submission';

export class GetCompletedSubmissionsUseCase {
  constructor(private submissionRepository: ISubmissionRepository) {}

  async execute(): Promise<SubmissionEntity[]> {
    // findCompleted returns all submissions where completed_at IS NOT NULL
    // already sorted by completed_at DESC
    return await this.submissionRepository.findCompleted();
  }
}
