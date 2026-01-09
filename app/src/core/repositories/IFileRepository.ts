import {FileEntity} from '../entities/File';

export interface IFileRepository {
  /**
   * Creates a new file attachment
   */
  create(file: FileEntity): Promise<void>;

  /**
   * Finds a file by ID
   */
  findById(id: string): Promise<FileEntity | null>;

  /**
   * Gets all files for a submission
   */
  findBySubmissionId(submissionId: string): Promise<FileEntity[]>;

  /**
   * Gets all files for a question in a submission
   */
  findByQuestionId(submissionId: string, questionId: string): Promise<FileEntity[]>;

  /**
   * Gets files by status
   */
  findByStatus(status: 'pending' | 'uploading' | 'synced' | 'error'): Promise<FileEntity[]>;

  /**
   * Gets unsynced files (pending, uploading, or error)
   */
  findUnsynced(): Promise<FileEntity[]>;

  /**
   * Updates a file
   */
  update(file: FileEntity): Promise<void>;

  /**
   * Marks a file as uploading
   */
  markAsUploading(id: string): Promise<void>;

  /**
   * Marks a file as synced
   */
  markAsSynced(id: string): Promise<void>;

  /**
   * Marks a file as error
   */
  markAsError(id: string): Promise<void>;

  /**
   * Deletes a file by ID
   */
  delete(id: string): Promise<void>;

  /**
   * Gets all files
   */
  findAll(): Promise<FileEntity[]>;
}
