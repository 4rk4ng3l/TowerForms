export type SyncStatus = 'pending' | 'syncing' | 'synced' | 'failed';

export interface Answer {
  questionId: string;
  value: string | string[] | number | null;
  fileIds?: string[];
}

export interface SubmissionMetadata {
  [key: string]: any; // Flexible metadata based on Form's metadataSchema
}

export interface Submission {
  id: string;
  formId: string;
  userId: string;
  answers: Answer[];
  metadata: SubmissionMetadata | null;
  startedAt: Date;
  completedAt: Date | null;
  syncStatus: SyncStatus;
  syncedAt: Date | null;
  createdAt: Date;
  updatedAt: Date;
}

export class SubmissionEntity implements Submission {
  constructor(
    public readonly id: string,
    public readonly formId: string,
    public readonly userId: string,
    public readonly answers: Answer[],
    public readonly metadata: SubmissionMetadata | null,
    public readonly startedAt: Date,
    public readonly completedAt: Date | null,
    public readonly syncStatus: SyncStatus,
    public readonly syncedAt: Date | null,
    public readonly createdAt: Date,
    public readonly updatedAt: Date,
  ) {}

  static create(
    id: string,
    formId: string,
    userId: string,
    metadata: SubmissionMetadata | null = null,
  ): SubmissionEntity {
    const now = new Date();

    return new SubmissionEntity(
      id,
      formId,
      userId,
      [], // Empty answers initially
      metadata,
      now, // startedAt
      null, // completedAt
      'pending', // syncStatus
      null, // syncedAt
      now, // createdAt
      now, // updatedAt
    );
  }

  addAnswer(answer: Answer): SubmissionEntity {
    const existingIndex = this.answers.findIndex(
      a => a.questionId === answer.questionId,
    );

    let newAnswers: Answer[];
    if (existingIndex >= 0) {
      // Update existing answer
      newAnswers = [...this.answers];
      newAnswers[existingIndex] = answer;
    } else {
      // Add new answer
      newAnswers = [...this.answers, answer];
    }

    return new SubmissionEntity(
      this.id,
      this.formId,
      this.userId,
      newAnswers,
      this.metadata,
      this.startedAt,
      this.completedAt,
      this.syncStatus,
      this.syncedAt,
      this.createdAt,
      new Date(), // updatedAt
    );
  }

  updateMetadata(newMetadata: SubmissionMetadata): SubmissionEntity {
    return new SubmissionEntity(
      this.id,
      this.formId,
      this.userId,
      this.answers,
      newMetadata,
      this.startedAt,
      this.completedAt,
      this.syncStatus,
      this.syncedAt,
      this.createdAt,
      new Date(), // updatedAt
    );
  }

  complete(): SubmissionEntity {
    if (this.completedAt !== null) {
      return this; // Already completed
    }

    return new SubmissionEntity(
      this.id,
      this.formId,
      this.userId,
      this.answers,
      this.metadata,
      this.startedAt,
      new Date(), // completedAt
      this.syncStatus,
      this.syncedAt,
      this.createdAt,
      new Date(), // updatedAt
    );
  }

  markAsSynced(): SubmissionEntity {
    return new SubmissionEntity(
      this.id,
      this.formId,
      this.userId,
      this.answers,
      this.metadata,
      this.startedAt,
      this.completedAt,
      'synced',
      new Date(), // syncedAt
      this.createdAt,
      new Date(), // updatedAt
    );
  }

  markAsFailed(): SubmissionEntity {
    return new SubmissionEntity(
      this.id,
      this.formId,
      this.userId,
      this.answers,
      this.metadata,
      this.startedAt,
      this.completedAt,
      'failed',
      null, // syncedAt
      this.createdAt,
      new Date(), // updatedAt
    );
  }

  isCompleted(): boolean {
    return this.completedAt !== null;
  }

  isSynced(): boolean {
    return this.syncStatus === 'synced';
  }

  needsSync(): boolean {
    return this.isCompleted() && !this.isSynced();
  }

  toJson(): any {
    return {
      id: this.id,
      formId: this.formId,
      userId: this.userId,
      answers: this.answers,
      metadata: this.metadata,
      startedAt: this.startedAt.toISOString(),
      completedAt: this.completedAt?.toISOString(),
      syncStatus: this.syncStatus,
      syncedAt: this.syncedAt?.toISOString(),
      createdAt: this.createdAt.toISOString(),
      updatedAt: this.updatedAt.toISOString(),
    };
  }
}
