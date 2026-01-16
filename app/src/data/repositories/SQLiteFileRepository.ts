import {IFileRepository} from '@core/repositories/IFileRepository';
import {FileEntity, SyncStatus} from '@core/entities/File';
import {database} from '@infrastructure/database/database';

export class SQLiteFileRepository implements IFileRepository {
  async create(file: FileEntity): Promise<void> {
    const db = database;

    await db.executeSql(
      `INSERT INTO files (
        id, submission_id, step_id, question_id, local_path, remote_path,
        file_name, file_size, mime_type, sync_status, created_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        file.id,
        file.submissionId,
        file.stepId,
        file.questionId,
        file.localPath,
        file.remotePath,
        file.fileName,
        file.fileSize,
        file.mimeType,
        file.syncStatus,
        file.createdAt.toISOString(),
      ],
    );

    console.log(`[SQLiteFileRepository] Created file: ${file.id}`);
  }

  async findById(id: string): Promise<FileEntity | null> {
    const db = database;

    const result = await db.executeSql('SELECT * FROM files WHERE id = ?', [
      id,
    ]);

    if (result.rows.length === 0) {
      return null;
    }

    return this.mapRowToEntity(result.rows.item(0));
  }

  async findBySubmissionId(submissionId: string): Promise<FileEntity[]> {
    const db = database;

    console.log(`[SQLiteFileRepository] Finding files for submissionId: ${submissionId}`);

    const result = await db.executeSql(
      'SELECT * FROM files WHERE submission_id = ? ORDER BY created_at DESC',
      [submissionId],
    );

    console.log(`[SQLiteFileRepository] Found ${result.rows.length} files`);

    // Debug: mostrar todos los archivos en la BD
    const allFiles = await db.executeSql('SELECT id, submission_id, file_name FROM files');
    console.log('[SQLiteFileRepository] All files in DB:', allFiles.rows._array);

    return result.rows._array.map(row => this.mapRowToEntity(row));
  }

  async findByStepId(stepId: string): Promise<FileEntity[]> {
    const db = database;

    const result = await db.executeSql(
      'SELECT * FROM files WHERE step_id = ? ORDER BY created_at DESC',
      [stepId],
    );

    return result.rows._array.map(row => this.mapRowToEntity(row));
  }

  async findByQuestionId(
    submissionId: string,
    questionId: string,
  ): Promise<FileEntity[]> {
    const db = database;

    const result = await db.executeSql(
      'SELECT * FROM files WHERE submission_id = ? AND question_id = ? ORDER BY created_at DESC',
      [submissionId, questionId],
    );

    return result.rows._array.map(row => this.mapRowToEntity(row));
  }

  async findUnsynced(): Promise<FileEntity[]> {
    const db = database;

    const result = await db.executeSql(
      `SELECT * FROM files
       WHERE sync_status IN ('pending', 'failed')
       ORDER BY created_at DESC`,
    );

    return result.rows._array.map(row => this.mapRowToEntity(row));
  }

  async update(file: FileEntity): Promise<void> {
    const db = database;

    await db.executeSql(
      `UPDATE files
       SET local_path = ?, remote_path = ?, sync_status = ?
       WHERE id = ?`,
      [
        file.localPath,
        file.remotePath,
        file.syncStatus,
        file.id,
      ],
    );

    console.log(`[SQLiteFileRepository] Updated file: ${file.id}`);
  }

  async markAsSyncing(id: string): Promise<void> {
    const db = database;

    await db.executeSql('UPDATE files SET sync_status = ? WHERE id = ?', [
      'syncing',
      id,
    ]);

    console.log(`[SQLiteFileRepository] Marked file as syncing: ${id}`);
  }

  async markAsSynced(id: string, remotePath: string): Promise<void> {
    const db = database;

    await db.executeSql(
      'UPDATE files SET sync_status = ?, remote_path = ? WHERE id = ?',
      ['synced', remotePath, id],
    );

    console.log(`[SQLiteFileRepository] Marked file as synced: ${id}`);
  }

  async markAsFailed(id: string): Promise<void> {
    const db = database;

    await db.executeSql('UPDATE files SET sync_status = ? WHERE id = ?', [
      'failed',
      id,
    ]);

    console.log(`[SQLiteFileRepository] Marked file as failed: ${id}`);
  }

  async delete(id: string): Promise<void> {
    const db = database;

    await db.executeSql('DELETE FROM files WHERE id = ?', [id]);

    console.log(`[SQLiteFileRepository] Deleted file: ${id}`);
  }

  async findAll(): Promise<FileEntity[]> {
    const db = database;

    const result = await db.executeSql(
      'SELECT * FROM files ORDER BY created_at DESC',
    );

    return result.rows._array.map(row => this.mapRowToEntity(row));
  }

  async countUnsynced(): Promise<number> {
    const db = database;

    const result = await db.executeSql(
      `SELECT COUNT(*) as count FROM files
       WHERE sync_status IN ('pending', 'failed')`,
    );

    return result.rows.item(0).count;
  }

  private mapRowToEntity(row: any): FileEntity {
    return new FileEntity(
      row.id,
      row.submission_id,
      row.step_id,
      row.question_id,
      row.local_path,
      row.remote_path,
      row.file_name,
      row.file_size,
      row.mime_type,
      row.sync_status as SyncStatus,
      new Date(row.created_at),
    );
  }
}
