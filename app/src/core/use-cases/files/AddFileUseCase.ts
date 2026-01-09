import {FileEntity} from '@core/entities/File';
import {IFileRepository} from '@core/repositories/IFileRepository';

export class AddFileUseCase {
  constructor(private fileRepository: IFileRepository) {}

  async execute(
    submissionId: string,
    questionId: string,
    uri: string,
    fileName: string,
    mimeType: string,
    size: number,
    base64Data?: string,
  ): Promise<FileEntity> {
    try {
      console.log('[AddFileUseCase] Adding file:', fileName);

      // Generate unique ID
      const fileId = `file-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;

      // Create file entity
      const file = FileEntity.create(
        fileId,
        submissionId,
        questionId,
        fileName,
        mimeType,
        size,
        uri,
        base64Data,
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
