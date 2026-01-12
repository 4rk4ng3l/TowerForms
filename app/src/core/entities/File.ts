export type SyncStatus = 'pending' | 'syncing' | 'synced' | 'failed';

export interface FileAttachment {
  id: string;
  submissionId: string;
  stepId: string;
  questionId: string | null;
  localPath: string | null;
  remotePath: string | null;
  fileName: string;
  fileSize: number;
  mimeType: string;
  syncStatus: SyncStatus;
  createdAt: Date;
}

export class FileEntity implements FileAttachment {
  constructor(
    public readonly id: string,
    public readonly submissionId: string,
    public readonly stepId: string,
    public readonly questionId: string | null,
    public readonly localPath: string | null,
    public readonly remotePath: string | null,
    public readonly fileName: string,
    public readonly fileSize: number,
    public readonly mimeType: string,
    public readonly syncStatus: SyncStatus,
    public readonly createdAt: Date,
  ) {}

  static create(
    id: string,
    submissionId: string,
    stepId: string,
    questionId: string | null,
    fileName: string,
    mimeType: string,
    fileSize: number,
    localPath: string,
  ): FileEntity {
    return new FileEntity(
      id,
      submissionId,
      stepId,
      questionId,
      localPath,
      null, // remotePath
      fileName,
      fileSize,
      mimeType,
      'pending',
      new Date(),
    );
  }

  markAsSyncing(): FileEntity {
    return new FileEntity(
      this.id,
      this.submissionId,
      this.stepId,
      this.questionId,
      this.localPath,
      this.remotePath,
      this.fileName,
      this.fileSize,
      this.mimeType,
      'syncing',
      this.createdAt,
    );
  }

  markAsSynced(remotePath: string): FileEntity {
    return new FileEntity(
      this.id,
      this.submissionId,
      this.stepId,
      this.questionId,
      this.localPath,
      remotePath,
      this.fileName,
      this.fileSize,
      this.mimeType,
      'synced',
      this.createdAt,
    );
  }

  markAsFailed(): FileEntity {
    return new FileEntity(
      this.id,
      this.submissionId,
      this.stepId,
      this.questionId,
      this.localPath,
      this.remotePath,
      this.fileName,
      this.fileSize,
      this.mimeType,
      'failed',
      this.createdAt,
    );
  }

  isSynced(): boolean {
    return this.syncStatus === 'synced';
  }

  isImage(): boolean {
    return this.mimeType.startsWith('image/');
  }

  isVideo(): boolean {
    return this.mimeType.startsWith('video/');
  }

  isPDF(): boolean {
    return this.mimeType === 'application/pdf';
  }

  toJson(): any {
    return {
      id: this.id,
      submissionId: this.submissionId,
      stepId: this.stepId,
      questionId: this.questionId,
      localPath: this.localPath,
      remotePath: this.remotePath,
      fileName: this.fileName,
      fileSize: this.fileSize,
      mimeType: this.mimeType,
      syncStatus: this.syncStatus,
      createdAt: this.createdAt.toISOString(),
    };
  }
}
