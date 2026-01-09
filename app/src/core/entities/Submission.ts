export type SubmissionStatus = 'draft' | 'completed' | 'synced';

export interface Answer {
  questionId: string;
  value: string | string[] | number | null;
  fileIds?: string[];
}

export interface SubmissionMetadata {
  deviceId: string;
  location?: {lat: number; lng: number};
  startedAt: Date;
  completedAt?: Date;
  [key: string]: any; // Allow additional metadata fields
}

export interface Submission {
  id: string;
  formId: string;
  userId: string;
  answers: Answer[];
  metadata: SubmissionMetadata;
  status: SubmissionStatus;
  createdAt: Date;
  updatedAt: Date;
  syncedAt?: Date;
}

export class SubmissionEntity implements Submission {
  constructor(
    public readonly id: string,
    public readonly formId: string,
    public readonly userId: string,
    public readonly answers: Answer[],
    public readonly metadata: SubmissionMetadata,
    public readonly status: SubmissionStatus,
    public readonly createdAt: Date,
    public readonly updatedAt: Date,
    public readonly syncedAt?: Date,
  ) {}

  static create(
    id: string,
    formId: string,
    userId: string,
    metadata: Partial<SubmissionMetadata> = {},
  ): SubmissionEntity {
    const now = new Date();
    const fullMetadata: SubmissionMetadata = {
      deviceId: '', // Will be set from device info
      startedAt: now,
      ...metadata,
    };

    return new SubmissionEntity(
      id,
      formId,
      userId,
      [], // Empty answers initially
      fullMetadata,
      'draft',
      now,
      now,
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
      this.status,
      this.createdAt,
      new Date(), // Update timestamp
      this.syncedAt,
    );
  }

  complete(): SubmissionEntity {
    if (this.status === 'completed' || this.status === 'synced') {
      return this;
    }

    const updatedMetadata: SubmissionMetadata = {
      ...this.metadata,
      completedAt: new Date(),
    };

    return new SubmissionEntity(
      this.id,
      this.formId,
      this.userId,
      this.answers,
      updatedMetadata,
      'completed',
      this.createdAt,
      new Date(),
      this.syncedAt,
    );
  }

  markAsSynced(): SubmissionEntity {
    return new SubmissionEntity(
      this.id,
      this.formId,
      this.userId,
      this.answers,
      this.metadata,
      'synced',
      this.createdAt,
      this.updatedAt,
      new Date(),
    );
  }

  isCompleted(): boolean {
    return this.status === 'completed' || this.status === 'synced';
  }

  isSynced(): boolean {
    return this.status === 'synced';
  }

  toJson(): any {
    return {
      id: this.id,
      formId: this.formId,
      userId: this.userId,
      answers: this.answers,
      metadata: {
        ...this.metadata,
        startedAt: this.metadata.startedAt.toISOString(),
        completedAt: this.metadata.completedAt?.toISOString(),
      },
      status: this.status,
      createdAt: this.createdAt.toISOString(),
      updatedAt: this.updatedAt.toISOString(),
      syncedAt: this.syncedAt?.toISOString(),
    };
  }
}
