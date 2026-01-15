import {FileEntity} from '@core/entities/File';
import {IFileRepository} from '@core/repositories/IFileRepository';
import {generateUUID} from '@shared/utils/idGenerator';

export class AddFileUseCase {
  constructor(private fileRepository: IFileRepository) {}

  async execute(
    submissionId: string,
    stepId: string,
    questionId: string | null,
    uri: string,
    fileName: string,
    mimeType: string,
    size: number,
  ): Promise<FileEntity> {
    try {
      console.log('[AddFileUseCase] Adding file:', fileName);

      // Generate unique UUID
      const fileId = generateUUID();

      // Create file entity
      const file = FileEntity.create(
        fileId,
        submissionId,
        stepId,
        questionId,
        fileName,
        mimeType,
        size,
        uri,
      );

      // Save to database
      await this.fileRepository.create(file);

      console.log('[AddFileUseCase] File added:', fileId);

      return file;
    } catch (error: any) {
      console.error('[AddFileUseCase] Error adding file:', error);
      throw new Error('Failed to add file');
    }
  }
}
