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
   * Gets all files for a form step
   */
  findByStepId(stepId: string): Promise<FileEntity[]>;

  /**
   * Gets all files for a question in a submission
   */
  findByQuestionId(submissionId: string, questionId: string): Promise<FileEntity[]>;

  /**
   * Gets unsynced files (sync_status = 'pending' or 'failed')
   */
  findUnsynced(): Promise<FileEntity[]>;

  /**
   * Updates a file
   */
  update(file: FileEntity): Promise<void>;

  /**
   * Marks a file as syncing
   */
  markAsSyncing(id: string): Promise<void>;

  /**
   * Marks a file as synced with remote path
   */
  markAsSynced(id: string, remotePath: string): Promise<void>;

  /**
   * Marks a file as failed
   */
  markAsFailed(id: string): Promise<void>;

  /**
   * Deletes a file by ID
   */
  delete(id: string): Promise<void>;

  /**
   * Gets all files
   */
  findAll(): Promise<FileEntity[]>;

  /**
   * Counts unsynced files
   */
  countUnsynced(): Promise<number>;
}
