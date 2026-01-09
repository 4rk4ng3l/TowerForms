export type SyncOperation = 'create' | 'update' | 'delete';
export type SyncEntityType = 'submission' | 'file';
export type SyncStatus = 'pending' | 'processing' | 'completed' | 'failed';

export interface SyncQueueItem {
  id: string;
  operation: SyncOperation;
  entityType: SyncEntityType;
  entityId: string;
  payload: any;
  attempts: number;
  maxAttempts: number;
  status: SyncStatus;
  error?: string;
  createdAt: Date;
  updatedAt: Date;
}

export class SyncQueueEntity implements SyncQueueItem {
  constructor(
    public readonly id: string,
    public readonly operation: SyncOperation,
    public readonly entityType: SyncEntityType,
    public readonly entityId: string,
    public readonly payload: any,
    public readonly attempts: number,
    public readonly maxAttempts: number,
    public readonly status: SyncStatus,
    public readonly error: string | undefined,
    public readonly createdAt: Date,
    public readonly updatedAt: Date,
  ) {}

  static create(
    id: string,
    operation: SyncOperation,
    entityType: SyncEntityType,
    entityId: string,
    payload: any,
    maxAttempts: number = 3,
  ): SyncQueueEntity {
    const now = new Date();
    return new SyncQueueEntity(
      id,
      operation,
      entityType,
      entityId,
      payload,
      0,
      maxAttempts,
      'pending',
      undefined,
      now,
      now,
    );
  }

  markAsProcessing(): SyncQueueEntity {
    return new SyncQueueEntity(
      this.id,
      this.operation,
      this.entityType,
      this.entityId,
      this.payload,
      this.attempts,
      this.maxAttempts,
      'processing',
      this.error,
      this.createdAt,
      new Date(),
    );
  }

  markAsCompleted(): SyncQueueEntity {
    return new SyncQueueEntity(
      this.id,
      this.operation,
      this.entityType,
      this.entityId,
      this.payload,
      this.attempts,
      this.maxAttempts,
      'completed',
      undefined,
      this.createdAt,
      new Date(),
    );
  }

  markAsFailed(error: string): SyncQueueEntity {
    return new SyncQueueEntity(
      this.id,
      this.operation,
      this.entityType,
      this.entityId,
      this.payload,
      this.attempts + 1,
      this.maxAttempts,
      'failed',
      error,
      this.createdAt,
      new Date(),
    );
  }

  retry(): SyncQueueEntity {
    return new SyncQueueEntity(
      this.id,
      this.operation,
      this.entityType,
      this.entityId,
      this.payload,
      this.attempts + 1,
      this.maxAttempts,
      'pending',
      this.error,
      this.createdAt,
      new Date(),
    );
  }

  hasExceededMaxAttempts(): boolean {
    return this.attempts >= this.maxAttempts;
  }

  canRetry(): boolean {
    return this.status === 'failed' && !this.hasExceededMaxAttempts();
  }

  toJson(): any {
    return {
      id: this.id,
      operation: this.operation,
      entityType: this.entityType,
      entityId: this.entityId,
      payload: this.payload,
      attempts: this.attempts,
      maxAttempts: this.maxAttempts,
      status: this.status,
      error: this.error,
      createdAt: this.createdAt.toISOString(),
      updatedAt: this.updatedAt.toISOString(),
    };
  }
}
