import {FileEntity} from '@core/entities/File';
import {IFileRepository} from '@core/repositories/IFileRepository';

export class GetFilesForQuestionUseCase {
  constructor(private fileRepository: IFileRepository) {}

  async execute(submissionId: string, questionId: string): Promise<FileEntity[]> {
    try {
      console.log('[GetFilesForQuestionUseCase] Getting files for question:', questionId);

      const files = await this.fileRepository.findByQuestionId(
        submissionId,
        questionId,
      );

      console.log('[GetFilesForQuestionUseCase] Found files:', files.length);

      return files;
    } catch (error: any) {
      console.error('[GetFilesForQuestionUseCase] Error getting files:', error);
      throw new Error('Failed to get files');
    }
  }
}
