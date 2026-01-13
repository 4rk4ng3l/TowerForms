import {database} from './database';

/**
 * Utility functions for database management
 */

export const DatabaseUtils = {
  /**
   * Clear all submission-related data from the database
   * This includes submissions, answers, and files
   */
  async clearSubmissionData(): Promise<void> {
    const db = database;

    try {
      console.log('[DatabaseUtils] Starting to clear submission data...');

      // Delete in order due to foreign key constraints
      await db.executeSql('DELETE FROM files');
      console.log('[DatabaseUtils] Deleted all files');

      await db.executeSql('DELETE FROM answers');
      console.log('[DatabaseUtils] Deleted all answers');

      await db.executeSql('DELETE FROM submissions');
      console.log('[DatabaseUtils] Deleted all submissions');

      console.log('[DatabaseUtils] Successfully cleared all submission data');
    } catch (error) {
      console.error('[DatabaseUtils] Error clearing submission data:', error);
      throw error;
    }
  },

  /**
   * Clear all local data including forms, submissions, and user data
   * WARNING: This will delete everything except migrations table
   */
  async clearAllData(): Promise<void> {
    const db = database;

    try {
      console.log('[DatabaseUtils] Starting to clear all data...');

      // Delete in order due to foreign key constraints
      await db.executeSql('DELETE FROM files');
      await db.executeSql('DELETE FROM answers');
      await db.executeSql('DELETE FROM submissions');
      await db.executeSql('DELETE FROM questions');
      await db.executeSql('DELETE FROM form_steps');
      await db.executeSql('DELETE FROM forms');

      console.log('[DatabaseUtils] Successfully cleared all data');
    } catch (error) {
      console.error('[DatabaseUtils] Error clearing all data:', error);
      throw error;
    }
  },

  /**
   * Get database statistics
   */
  async getStats(): Promise<{
    submissions: number;
    answers: number;
    files: number;
    forms: number;
  }> {
    const db = database;

    try {
      const [submissionsResult, answersResult, filesResult, formsResult] =
        await Promise.all([
          db.executeSql('SELECT COUNT(*) as count FROM submissions'),
          db.executeSql('SELECT COUNT(*) as count FROM answers'),
          db.executeSql('SELECT COUNT(*) as count FROM files'),
          db.executeSql('SELECT COUNT(*) as count FROM forms'),
        ]);

      return {
        submissions: submissionsResult.rows.item(0).count,
        answers: answersResult.rows.item(0).count,
        files: filesResult.rows.item(0).count,
        forms: formsResult.rows.item(0).count,
      };
    } catch (error) {
      console.error('[DatabaseUtils] Error getting stats:', error);
      throw error;
    }
  },

  /**
   * Get sync statistics
   */
  async getSyncStats(): Promise<{
    totalSubmissions: number;
    pendingSubmissions: number;
    syncedSubmissions: number;
    failedSubmissions: number;
    totalFiles: number;
    pendingFiles: number;
    syncedFiles: number;
    failedFiles: number;
  }> {
    const db = database;

    try {
      const [
        totalSubmissionsResult,
        pendingSubmissionsResult,
        syncedSubmissionsResult,
        failedSubmissionsResult,
        totalFilesResult,
        pendingFilesResult,
        syncedFilesResult,
        failedFilesResult,
      ] = await Promise.all([
        db.executeSql('SELECT COUNT(*) as count FROM submissions'),
        db.executeSql(
          "SELECT COUNT(*) as count FROM submissions WHERE sync_status = 'pending'",
        ),
        db.executeSql(
          "SELECT COUNT(*) as count FROM submissions WHERE sync_status = 'synced'",
        ),
        db.executeSql(
          "SELECT COUNT(*) as count FROM submissions WHERE sync_status = 'failed'",
        ),
        db.executeSql('SELECT COUNT(*) as count FROM files'),
        db.executeSql(
          "SELECT COUNT(*) as count FROM files WHERE sync_status = 'pending'",
        ),
        db.executeSql(
          "SELECT COUNT(*) as count FROM files WHERE sync_status = 'synced'",
        ),
        db.executeSql(
          "SELECT COUNT(*) as count FROM files WHERE sync_status = 'failed'",
        ),
      ]);

      return {
        totalSubmissions: totalSubmissionsResult.rows.item(0).count,
        pendingSubmissions: pendingSubmissionsResult.rows.item(0).count,
        syncedSubmissions: syncedSubmissionsResult.rows.item(0).count,
        failedSubmissions: failedSubmissionsResult.rows.item(0).count,
        totalFiles: totalFilesResult.rows.item(0).count,
        pendingFiles: pendingFilesResult.rows.item(0).count,
        syncedFiles: syncedFilesResult.rows.item(0).count,
        failedFiles: failedFilesResult.rows.item(0).count,
      };
    } catch (error) {
      console.error('[DatabaseUtils] Error getting sync stats:', error);
      throw error;
    }
  },

  /**
   * Reset failed submissions to pending to retry sync
   */
  async retryFailedSync(): Promise<{submissionsReset: number; filesReset: number}> {
    const db = database;

    try {
      console.log('[DatabaseUtils] Resetting failed submissions to pending...');

      const submissionsResult = await db.executeSql(
        "UPDATE submissions SET sync_status = 'pending' WHERE sync_status = 'failed'",
      );

      const filesResult = await db.executeSql(
        "UPDATE files SET sync_status = 'pending' WHERE sync_status = 'failed'",
      );

      const submissionsReset = submissionsResult.rowsAffected || 0;
      const filesReset = filesResult.rowsAffected || 0;

      console.log(
        `[DatabaseUtils] Reset ${submissionsReset} submissions and ${filesReset} files to pending`,
      );

      return {submissionsReset, filesReset};
    } catch (error) {
      console.error('[DatabaseUtils] Error resetting failed sync:', error);
      throw error;
    }
  },
};
