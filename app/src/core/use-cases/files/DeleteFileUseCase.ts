import {IFileRepository} from '@core/repositories/IFileRepository';

export class DeleteFileUseCase {
  constructor(private fileRepository: IFileRepository) {}

  async execute(fileId: string): Promise<void> {
    try {
      console.log('[DeleteFileUseCase] Deleting file:', fileId);

      await this.fileRepository.delete(fileId);

      console.log('[DeleteFileUseCase] File deleted');
    } catch (error: any) {
      console.error('[DeleteFileUseCase] Error deleting file:', error);
      throw new Error('Failed to delete file');
    }
  }
}
