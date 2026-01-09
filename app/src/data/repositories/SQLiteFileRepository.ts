import {IFileRepository} from '@core/repositories/IFileRepository';
import {FileEntity, FileStatus} from '@core/entities/File';
import {database} from '@infrastructure/database/database';

export class SQLiteFileRepository implements IFileRepository {
  async create(file: FileEntity): Promise<void> {
    const db = database;

    await db.executeSql(
      `INSERT INTO files (
        id, submission_id, question_id, file_name, mime_type,
        size, local_uri, base64_data, status, created_at, synced_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        file.id,
        file.submissionId,
        file.questionId,
        file.fileName,
        file.mimeType,
        file.size,
        file.localUri,
        file.base64Data || null,
        file.status,
        file.createdAt.toISOString(),
        file.syncedAt?.toISOString() || null,
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

    const result = await db.executeSql(
      'SELECT * FROM files WHERE submission_id = ? ORDER BY created_at DESC',
      [submissionId],
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

  async findByStatus(status: FileStatus): Promise<FileEntity[]> {
    const db = database;

    const result = await db.executeSql(
      'SELECT * FROM files WHERE status = ? ORDER BY created_at DESC',
      [status],
    );

    return result.rows._array.map(row => this.mapRowToEntity(row));
  }

  async findUnsynced(): Promise<FileEntity[]> {
    const db = database;

    const result = await db.executeSql(
      `SELECT * FROM files
       WHERE status IN ('pending', 'uploading', 'error')
       ORDER BY created_at DESC`,
    );

    return result.rows._array.map(row => this.mapRowToEntity(row));
  }

  async update(file: FileEntity): Promise<void> {
    const db = database;

    await db.executeSql(
      `UPDATE files
       SET base64_data = ?, status = ?, synced_at = ?
       WHERE id = ?`,
      [
        file.base64Data || null,
        file.status,
        file.syncedAt?.toISOString() || null,
        file.id,
      ],
    );

    console.log(`[SQLiteFileRepository] Updated file: ${file.id}`);
  }

  async markAsUploading(id: string): Promise<void> {
    const db = database;

    await db.executeSql('UPDATE files SET status = ? WHERE id = ?', [
      'uploading',
      id,
    ]);

    console.log(`[SQLiteFileRepository] Marked file as uploading: ${id}`);
  }

  async markAsSynced(id: string): Promise<void> {
    const db = database;

    await db.executeSql(
      'UPDATE files SET status = ?, synced_at = ? WHERE id = ?',
      ['synced', new Date().toISOString(), id],
    );

    console.log(`[SQLiteFileRepository] Marked file as synced: ${id}`);
  }

  async markAsError(id: string): Promise<void> {
    const db = database;

    await db.executeSql('UPDATE files SET status = ? WHERE id = ?', [
      'error',
      id,
    ]);

    console.log(`[SQLiteFileRepository] Marked file as error: ${id}`);
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

  private mapRowToEntity(row: any): FileEntity {
    return new FileEntity(
      row.id,
      row.submission_id,
      row.question_id,
      row.file_name,
      row.mime_type,
      row.size,
      row.local_uri,
      row.base64_data,
      row.status,
      new Date(row.created_at),
      row.synced_at ? new Date(row.synced_at) : undefined,
    );
  }
}
