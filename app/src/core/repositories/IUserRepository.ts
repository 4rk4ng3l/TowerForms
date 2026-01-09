import {UserEntity} from '../entities/User';

export interface IUserRepository {
  /**
   * Saves a user to the local database
   */
  save(user: UserEntity): Promise<void>;

  /**
   * Finds a user by ID
   */
  findById(id: string): Promise<UserEntity | null>;

  /**
   * Finds a user by email
   */
  findByEmail(email: string): Promise<UserEntity | null>;

  /**
   * Gets the currently logged in user
   */
  getCurrentUser(): Promise<UserEntity | null>;

  /**
   * Updates a user
   */
  update(user: UserEntity): Promise<void>;

  /**
   * Deletes a user by ID
   */
  delete(id: string): Promise<void>;

  /**
   * Clears all users from the local database
   */
  clear(): Promise<void>;
}
