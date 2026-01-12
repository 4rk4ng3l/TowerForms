import {SubmissionEntity, Answer} from '../entities/Submission';

export interface ISubmissionRepository {
  /**
   * Creates a new submission
   */
  create(submission: SubmissionEntity): Promise<void>;

  /**
   * Finds a submission by ID
   */
  findById(id: string): Promise<SubmissionEntity | null>;

  /**
   * Gets all submissions for a user
   */
  findByUserId(userId: string): Promise<SubmissionEntity[]>;

  /**
   * Gets all submissions for a form
   */
  findByFormId(formId: string): Promise<SubmissionEntity[]>;

  /**
   * Gets all completed submissions (where completed_at IS NOT NULL)
   */
  findCompleted(): Promise<SubmissionEntity[]>;

  /**
   * Gets unsynced submissions (completed but with sync_status = 'pending' or 'failed')
   */
  findUnsynced(): Promise<SubmissionEntity[]>;

  /**
   * Updates a submission
   */
  update(submission: SubmissionEntity): Promise<void>;

  /**
   * Updates an answer for a submission
   */
  updateAnswer(submissionId: string, answer: Answer): Promise<void>;

  /**
   * Marks a submission as completed
   */
  markAsCompleted(id: string): Promise<void>;

  /**
   * Marks a submission as synced
   */
  markAsSynced(id: string): Promise<void>;

  /**
   * Marks a submission as failed
   */
  markAsFailed(id: string): Promise<void>;

  /**
   * Deletes a submission by ID
   */
  delete(id: string): Promise<void>;

  /**
   * Gets all submissions
   */
  findAll(): Promise<SubmissionEntity[]>;

  /**
   * Counts completed submissions
   */
  countCompleted(): Promise<number>;

  /**
   * Counts unsynced submissions
   */
  countUnsynced(): Promise<number>;
}
