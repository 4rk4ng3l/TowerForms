import {FileEntity} from '@core/entities/File';
import {IFileRepository} from '@core/repositories/IFileRepository';
import {generateUUID} from '@shared/utils/idGenerator';
import { Paths, Directory, File } from 'expo-file-system/next';

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
      console.log('[AddFileUseCase] Adding file:', {
        fileName,
        submissionId,
        stepId,
        questionId,
        uri,
        mimeType,
        size,
      });

      // Generate unique UUID
      const fileId = generateUUID();
      console.log('[AddFileUseCase] Generated fileId:', fileId);

      // Create permanent directory for files using new expo-file-system API
      const filesDir = new Directory(Paths.document, 'towerforms_files');
      console.log('[AddFileUseCase] Files directory:', filesDir.uri);

      // Create directory if it doesn't exist
      if (!filesDir.exists) {
        await filesDir.create();
        console.log('[AddFileUseCase] Created files directory');
      }

      // Create destination file
      const destFileName = `${fileId}_${fileName}`;
      const destFile = new File(filesDir, destFileName);
      const permanentPath = destFile.uri;
      console.log('[AddFileUseCase] Destination path:', permanentPath);

      // Copy file from temporary URI to permanent location
      const sourceFile = new File(uri);
      await sourceFile.copy(destFile);
      console.log('[AddFileUseCase] File copied to:', permanentPath);

      // Create file entity with permanent path
      const file = FileEntity.create(
        fileId,
        submissionId,
        stepId,
        questionId,
        fileName,
        mimeType,
        size,
        permanentPath,
      );

      // Save to database
      await this.fileRepository.create(file);

      console.log('[AddFileUseCase] File added:', fileId);

      return file;
    } catch (error: any) {
      console.error('[AddFileUseCase] Error adding file:', {
        message: error.message,
        code: error.code,
        stack: error.stack,
      });
      throw new Error(`Failed to add file: ${error.message}`);
    }
  }
}
