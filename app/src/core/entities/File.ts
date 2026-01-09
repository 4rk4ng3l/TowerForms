export type FileStatus = 'pending' | 'uploading' | 'synced' | 'error';

export interface FileAttachment {
  id: string;
  submissionId: string;
  questionId: string;
  fileName: string;
  mimeType: string;
  size: number;
  localUri: string;
  base64Data?: string; // For sync
  status: FileStatus;
  createdAt: Date;
  syncedAt?: Date;
}

export class FileEntity implements FileAttachment {
  constructor(
    public readonly id: string,
    public readonly submissionId: string,
    public readonly questionId: string,
    public readonly fileName: string,
    public readonly mimeType: string,
    public readonly size: number,
    public readonly localUri: string,
    public readonly base64Data: string | undefined,
    public readonly status: FileStatus,
    public readonly createdAt: Date,
    public readonly syncedAt?: Date,
  ) {}

  static create(
    id: string,
    submissionId: string,
    questionId: string,
    fileName: string,
    mimeType: string,
    size: number,
    localUri: string,
    base64Data?: string,
  ): FileEntity {
    return new FileEntity(
      id,
      submissionId,
      questionId,
      fileName,
      mimeType,
      size,
      localUri,
      base64Data,
      'pending',
      new Date(),
    );
  }

  setStatus(status: FileStatus): FileEntity {
    return new FileEntity(
      this.id,
      this.submissionId,
      this.questionId,
      this.fileName,
      this.mimeType,
      this.size,
      this.localUri,
      this.base64Data,
      status,
      this.createdAt,
      this.syncedAt,
    );
  }

  markAsUploading(): FileEntity {
    return this.setStatus('uploading');
  }

  markAsSynced(): FileEntity {
    return new FileEntity(
      this.id,
      this.submissionId,
      this.questionId,
      this.fileName,
      this.mimeType,
      this.size,
      this.localUri,
      this.base64Data,
      'synced',
      this.createdAt,
      new Date(),
    );
  }

  markAsError(): FileEntity {
    return this.setStatus('error');
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
      questionId: this.questionId,
      fileName: this.fileName,
      mimeType: this.mimeType,
      size: this.size,
      localUri: this.localUri,
      base64Data: this.base64Data,
      status: this.status,
      createdAt: this.createdAt.toISOString(),
      syncedAt: this.syncedAt?.toISOString(),
    };
  }
}
