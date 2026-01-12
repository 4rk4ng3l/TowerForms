import {ISubmissionRepository} from '../../repositories/ISubmissionRepository';
import {SubmissionEntity} from '../../entities/Submission';

export class GetAllSubmissionsUseCase {
  constructor(private submissionRepository: ISubmissionRepository) {}

  async execute(): Promise<SubmissionEntity[]> {
    return await this.submissionRepository.findAll();
  }
}
