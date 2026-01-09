import {SyncQueueEntity} from '../entities/SyncQueue';

export interface ISyncQueueRepository {
  /**
   * Adds an item to the sync queue
   */
  enqueue(item: SyncQueueEntity): Promise<void>;

  /**
   * Gets the next pending item from the queue
   */
  getNextPending(): Promise<SyncQueueEntity | null>;

  /**
   * Gets all pending items
   */
  findPending(): Promise<SyncQueueEntity[]>;

  /**
   * Gets all failed items that can be retried
   */
  findRetryable(): Promise<SyncQueueEntity[]>;

  /**
   * Finds a sync queue item by ID
   */
  findById(id: string): Promise<SyncQueueEntity | null>;

  /**
   * Finds sync queue items by entity
   */
  findByEntity(entityType: string, entityId: string): Promise<SyncQueueEntity[]>;

  /**
   * Updates a sync queue item
   */
  update(item: SyncQueueEntity): Promise<void>;

  /**
   * Marks an item as processing
   */
  markAsProcessing(id: string): Promise<void>;

  /**
   * Marks an item as completed
   */
  markAsCompleted(id: string): Promise<void>;

  /**
   * Marks an item as failed
   */
  markAsFailed(id: string, error: string): Promise<void>;

  /**
   * Retries a failed item
   */
  retry(id: string): Promise<void>;

  /**
   * Deletes an item from the queue
   */
  delete(id: string): Promise<void>;

  /**
   * Clears all completed items
   */
  clearCompleted(): Promise<void>;

  /**
   * Gets the count of pending items
   */
  countPending(): Promise<number>;

  /**
   * Gets all items
   */
  findAll(): Promise<SyncQueueEntity[]>;
}
