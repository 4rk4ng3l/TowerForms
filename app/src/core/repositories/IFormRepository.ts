import { Form } from '../entities/Form';

export interface IFormRepository {
  /**
   * Get a form by ID from local storage
   */
  getById(id: string): Promise<Form | null>;

  /**
   * Get all forms from local storage
   */
  getAll(): Promise<Form[]>;

  /**
   * Save a form to local storage
   */
  save(form: Form): Promise<void>;

  /**
   * Delete a form from local storage
   */
  delete(id: string): Promise<void>;

  /**
   * Sync forms from remote server
   */
  syncFromRemote(): Promise<Form[]>;
}
