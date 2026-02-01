import {ISubmissionRepository} from '@core/repositories/ISubmissionRepository';
import {SubmissionEntity, Answer, SyncStatus} from '@core/entities/Submission';
import {database} from '@infrastructure/database/database';
import {generateUUID} from '@shared/utils/idGenerator';

export class SQLiteSubmissionRepository implements ISubmissionRepository {
  async create(submission: SubmissionEntity): Promise<void> {
    const db = database;

    await db.transaction(async tx => {
      // Insert submission
      await tx.executeSql(
        `INSERT INTO submissions (
          id, form_id, user_id, metadata, started_at, completed_at,
          sync_status, synced_at, created_at, updated_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          submission.id,
          submission.formId,
          submission.userId,
          submission.metadata ? JSON.stringify(submission.metadata) : null,
          submission.startedAt.toISOString(),
          submission.completedAt?.toISOString() || null,
          submission.syncStatus,
          submission.syncedAt?.toISOString() || null,
          submission.createdAt.toISOString(),
          submission.updatedAt.toISOString(),
        ],
      );

      // Insert answers
      for (const answer of submission.answers) {
        await this.insertAnswer(tx, submission.id, answer);
      }
    });

    console.log(`[SQLiteSubmissionRepository] Created submission: ${submission.id}`);
  }

  async findById(id: string): Promise<SubmissionEntity | null> {
    const db = database;

    const result = await db.executeSql(
      'SELECT * FROM submissions WHERE id = ?',
      [id],
    );

    if (result.rows.length === 0) {
      return null;
    }

    const row = result.rows.item(0);
    const answers = await this.getAnswersForSubmission(id);

    return this.mapRowToEntity(row, answers);
  }

  async findByUserId(userId: string): Promise<SubmissionEntity[]> {
    const db = database;

    const result = await db.executeSql(
      'SELECT * FROM submissions WHERE user_id = ? ORDER BY created_at DESC',
      [userId],
    );

    return await this.mapRowsToEntities(result.rows._array);
  }

  async findByFormId(formId: string): Promise<SubmissionEntity[]> {
    const db = database;

    const result = await db.executeSql(
      'SELECT * FROM submissions WHERE form_id = ? ORDER BY created_at DESC',
      [formId],
    );

    return await this.mapRowsToEntities(result.rows._array);
  }

  async findCompleted(): Promise<SubmissionEntity[]> {
    const db = database;

    const result = await db.executeSql(
      `SELECT * FROM submissions
       WHERE completed_at IS NOT NULL
       ORDER BY completed_at DESC`,
    );

    return await this.mapRowsToEntities(result.rows._array);
  }

  async findUnsynced(): Promise<SubmissionEntity[]> {
    const db = database;

    const result = await db.executeSql(
      `SELECT * FROM submissions
       WHERE completed_at IS NOT NULL
       AND sync_status IN ('pending', 'failed')
       ORDER BY created_at DESC`,
    );

    return await this.mapRowsToEntities(result.rows._array);
  }

  async update(submission: SubmissionEntity): Promise<void> {
    const db = database;

    await db.transaction(async tx => {
      // Update submission
      await tx.executeSql(
        `UPDATE submissions
         SET metadata = ?, completed_at = ?, sync_status = ?,
             synced_at = ?, updated_at = ?
         WHERE id = ?`,
        [
          submission.metadata ? JSON.stringify(submission.metadata) : null,
          submission.completedAt?.toISOString() || null,
          submission.syncStatus,
          submission.syncedAt?.toISOString() || null,
          submission.updatedAt.toISOString(),
          submission.id,
        ],
      );

      // Delete existing answers
      await tx.executeSql('DELETE FROM answers WHERE submission_id = ?', [
        submission.id,
      ]);

      // Insert updated answers
      for (const answer of submission.answers) {
        await this.insertAnswer(tx, submission.id, answer);
      }
    });

    console.log(`[SQLiteSubmissionRepository] Updated submission: ${submission.id}`);
  }

  async updateAnswer(submissionId: string, answer: Answer): Promise<void> {
    const db = database;

    // Check if answer exists
    const existing = await db.executeSql(
      'SELECT id FROM answers WHERE submission_id = ? AND question_id = ?',
      [submissionId, answer.questionId],
    );

    if (existing.rows.length > 0) {
      // Update existing answer
      await db.executeSql(
        'UPDATE answers SET value = ?, comment = ? WHERE submission_id = ? AND question_id = ?',
        [
          JSON.stringify(answer.value),
          answer.comment || null,
          submissionId,
          answer.questionId,
        ],
      );
    } else {
      // Insert new answer
      await db.executeSql(
        'INSERT INTO answers (id, submission_id, question_id, value, comment) VALUES (?, ?, ?, ?, ?)',
        [
          generateUUID(), // Generate UUID for answer ID
          submissionId,
          answer.questionId,
          JSON.stringify(answer.value),
          answer.comment || null,
        ],
      );
    }

    // Update submission's updated_at timestamp
    await db.executeSql(
      'UPDATE submissions SET updated_at = ? WHERE id = ?',
      [new Date().toISOString(), submissionId],
    );

    console.log(`[SQLiteSubmissionRepository] Updated answer for submission: ${submissionId}`);
  }

  async markAsCompleted(id: string): Promise<void> {
    const db = database;

    await db.executeSql(
      'UPDATE submissions SET completed_at = ?, updated_at = ? WHERE id = ?',
      [new Date().toISOString(), new Date().toISOString(), id],
    );

    console.log(`[SQLiteSubmissionRepository] Marked submission as completed: ${id}`);
  }

  async markAsSynced(id: string): Promise<void> {
    const db = database;

    await db.executeSql(
      'UPDATE submissions SET sync_status = ?, synced_at = ?, updated_at = ? WHERE id = ?',
      ['synced', new Date().toISOString(), new Date().toISOString(), id],
    );

    console.log(`[SQLiteSubmissionRepository] Marked submission as synced: ${id}`);
  }

  async markAsFailed(id: string): Promise<void> {
    const db = database;

    await db.executeSql(
      'UPDATE submissions SET sync_status = ?, synced_at = NULL, updated_at = ? WHERE id = ?',
      ['failed', new Date().toISOString(), id],
    );

    console.log(`[SQLiteSubmissionRepository] Marked submission as failed: ${id}`);
  }

  async delete(id: string): Promise<void> {
    const db = database;

    await db.transaction(async tx => {
      // Delete answers (cascade should handle this, but doing it explicitly)
      await tx.executeSql('DELETE FROM answers WHERE submission_id = ?', [id]);

      // Delete submission
      await tx.executeSql('DELETE FROM submissions WHERE id = ?', [id]);
    });

    console.log(`[SQLiteSubmissionRepository] Deleted submission: ${id}`);
  }

  async findAll(): Promise<SubmissionEntity[]> {
    const db = database;

    const result = await db.executeSql(
      'SELECT * FROM submissions ORDER BY created_at DESC',
    );

    return await this.mapRowsToEntities(result.rows._array);
  }

  async countCompleted(): Promise<number> {
    const db = database;

    const result = await db.executeSql(
      'SELECT COUNT(*) as count FROM submissions WHERE completed_at IS NOT NULL',
    );

    return result.rows.item(0).count;
  }

  async countUnsynced(): Promise<number> {
    const db = database;

    const result = await db.executeSql(
      `SELECT COUNT(*) as count FROM submissions
       WHERE completed_at IS NOT NULL
       AND sync_status IN ('pending', 'failed')`,
    );

    return result.rows.item(0).count;
  }

  // Helper methods
  private async insertAnswer(
    tx: {executeSql: (sql: string, params?: any[]) => Promise<any>},
    submissionId: string,
    answer: Answer,
  ): Promise<void> {
    await tx.executeSql(
      'INSERT INTO answers (id, submission_id, question_id, value, comment) VALUES (?, ?, ?, ?, ?)',
      [
        generateUUID(), // Generate UUID for answer ID
        submissionId,
        answer.questionId,
        JSON.stringify(answer.value),
        answer.comment || null,
      ],
    );
  }

  private async getAnswersForSubmission(submissionId: string): Promise<Answer[]> {
    const db = database;

    const result = await db.executeSql(
      'SELECT * FROM answers WHERE submission_id = ?',
      [submissionId],
    );

    return result.rows._array.map(row => ({
      questionId: row.question_id,
      value: JSON.parse(row.value),
      comment: row.comment || null,
      fileIds: row.file_ids ? JSON.parse(row.file_ids) : undefined,
    }));
  }

  private async mapRowsToEntities(rows: any[]): Promise<SubmissionEntity[]> {
    const entities: SubmissionEntity[] = [];

    for (const row of rows) {
      const answers = await this.getAnswersForSubmission(row.id);
      entities.push(this.mapRowToEntity(row, answers));
    }

    return entities;
  }

  private mapRowToEntity(row: any, answers: Answer[]): SubmissionEntity {
    return new SubmissionEntity(
      row.id,
      row.form_id,
      row.user_id,
      answers,
      row.metadata ? JSON.parse(row.metadata) : null,
      new Date(row.started_at),
      row.completed_at ? new Date(row.completed_at) : null,
      row.sync_status as SyncStatus,
      row.synced_at ? new Date(row.synced_at) : null,
      new Date(row.created_at),
      new Date(row.updated_at),
    );
  }
}
