import * as SQLite from 'expo-sqlite';

interface Migration {
  version: number;
  name: string;
  up: (db: SQLite.SQLiteDatabase) => Promise<void>;
}

const MIGRATIONS_TABLE = 'migrations';
const CURRENT_VERSION = 5;

const migrations: Migration[] = [
  {
    version: 1,
    name: 'initial_schema',
    up: async (db: SQLite.SQLiteDatabase) => {
      console.log('[Migration] Running migration v1: initial_schema');

      // Users table
      await db.execAsync(`
        CREATE TABLE IF NOT EXISTS users (
          id TEXT PRIMARY KEY,
          email TEXT NOT NULL UNIQUE,
          name TEXT NOT NULL,
          role TEXT NOT NULL,
          created_at TEXT NOT NULL
        );
      `);

      // Forms table
      await db.execAsync(`
        CREATE TABLE IF NOT EXISTS forms (
          id TEXT PRIMARY KEY,
          name TEXT NOT NULL,
          description TEXT,
          version INTEGER NOT NULL DEFAULT 1,
          metadata_schema TEXT,
          created_at TEXT NOT NULL,
          updated_at TEXT NOT NULL
        );
      `);

      // Form steps table
      await db.execAsync(`
        CREATE TABLE IF NOT EXISTS form_steps (
          id TEXT PRIMARY KEY,
          form_id TEXT NOT NULL,
          step_number INTEGER NOT NULL,
          title TEXT NOT NULL,
          FOREIGN KEY (form_id) REFERENCES forms(id) ON DELETE CASCADE
        );
      `);

      // Create index for form_steps
      await db.execAsync(`
        CREATE INDEX IF NOT EXISTS idx_form_steps_form_id
        ON form_steps(form_id);
      `);

      // Questions table
      await db.execAsync(`
        CREATE TABLE IF NOT EXISTS questions (
          id TEXT PRIMARY KEY,
          step_id TEXT NOT NULL,
          question_text TEXT NOT NULL,
          type TEXT NOT NULL,
          options TEXT,
          is_required INTEGER NOT NULL DEFAULT 0,
          order_number INTEGER NOT NULL,
          metadata TEXT,
          FOREIGN KEY (step_id) REFERENCES form_steps(id) ON DELETE CASCADE
        );
      `);

      // Create index for questions
      await db.execAsync(`
        CREATE INDEX IF NOT EXISTS idx_questions_step_id
        ON questions(step_id);
      `);

      // Submissions table
      await db.execAsync(`
        CREATE TABLE IF NOT EXISTS submissions (
          id TEXT PRIMARY KEY,
          form_id TEXT NOT NULL,
          user_id TEXT,
          metadata TEXT,
          status TEXT NOT NULL DEFAULT 'draft',
          created_at TEXT NOT NULL,
          updated_at TEXT NOT NULL,
          synced_at TEXT,
          FOREIGN KEY (form_id) REFERENCES forms(id),
          FOREIGN KEY (user_id) REFERENCES users(id)
        );
      `);

      // Create indexes for submissions
      await db.execAsync(`
        CREATE INDEX IF NOT EXISTS idx_submissions_form_id
        ON submissions(form_id);
      `);

      await db.execAsync(`
        CREATE INDEX IF NOT EXISTS idx_submissions_user_id
        ON submissions(user_id);
      `);

      await db.execAsync(`
        CREATE INDEX IF NOT EXISTS idx_submissions_status
        ON submissions(status);
      `);

      // Answers table
      await db.execAsync(`
        CREATE TABLE IF NOT EXISTS answers (
          id TEXT PRIMARY KEY,
          submission_id TEXT NOT NULL,
          question_id TEXT NOT NULL,
          value TEXT,
          FOREIGN KEY (submission_id) REFERENCES submissions(id) ON DELETE CASCADE,
          FOREIGN KEY (question_id) REFERENCES questions(id)
        );
      `);

      // Create index for answers
      await db.execAsync(`
        CREATE INDEX IF NOT EXISTS idx_answers_submission_id
        ON answers(submission_id);
      `);

      // Files table
      await db.execAsync(`
        CREATE TABLE IF NOT EXISTS files (
          id TEXT PRIMARY KEY,
          submission_id TEXT NOT NULL,
          question_id TEXT NOT NULL,
          file_name TEXT NOT NULL,
          mime_type TEXT NOT NULL,
          size INTEGER NOT NULL,
          local_uri TEXT NOT NULL,
          base64_data TEXT,
          status TEXT NOT NULL DEFAULT 'pending',
          created_at TEXT NOT NULL,
          synced_at TEXT,
          FOREIGN KEY (submission_id) REFERENCES submissions(id) ON DELETE CASCADE,
          FOREIGN KEY (question_id) REFERENCES questions(id)
        );
      `);

      // Create indexes for files
      await db.execAsync(`
        CREATE INDEX IF NOT EXISTS idx_files_submission_id
        ON files(submission_id);
      `);

      await db.execAsync(`
        CREATE INDEX IF NOT EXISTS idx_files_status
        ON files(status);
      `);

      // Sync queue table
      await db.execAsync(`
        CREATE TABLE IF NOT EXISTS sync_queue (
          id TEXT PRIMARY KEY,
          operation TEXT NOT NULL,
          entity_type TEXT NOT NULL,
          entity_id TEXT NOT NULL,
          payload TEXT NOT NULL,
          attempts INTEGER NOT NULL DEFAULT 0,
          max_attempts INTEGER NOT NULL DEFAULT 3,
          status TEXT NOT NULL DEFAULT 'pending',
          error TEXT,
          created_at TEXT NOT NULL,
          last_attempt_at TEXT
        );
      `);

      // Create index for sync_queue
      await db.execAsync(`
        CREATE INDEX IF NOT EXISTS idx_sync_queue_status
        ON sync_queue(status);
      `);

      console.log('[Migration] Migration v1 completed successfully');
    },
  },
  {
    version: 2,
    name: 'add_compound_indexes',
    up: async (db: SQLite.SQLiteDatabase) => {
      console.log('[Migration] Running migration v2: add_compound_indexes');

      // Compound index for submissions by user and status
      await db.execAsync(`
        CREATE INDEX IF NOT EXISTS idx_submissions_user_status
        ON submissions(user_id, status);
      `);

      // Compound index for submissions by form and status
      await db.execAsync(`
        CREATE INDEX IF NOT EXISTS idx_submissions_form_status
        ON submissions(form_id, status);
      `);

      // Index for submissions sorted by created_at (for pagination)
      await db.execAsync(`
        CREATE INDEX IF NOT EXISTS idx_submissions_created_at
        ON submissions(created_at DESC);
      `);

      // Index for files by question
      await db.execAsync(`
        CREATE INDEX IF NOT EXISTS idx_files_question_id
        ON files(question_id);
      `);

      // Compound index for sync queue by status and created_at (for processing order)
      await db.execAsync(`
        CREATE INDEX IF NOT EXISTS idx_sync_queue_status_created
        ON sync_queue(status, created_at);
      `);

      // Index for answers by question (for analytics)
      await db.execAsync(`
        CREATE INDEX IF NOT EXISTS idx_answers_question_id
        ON answers(question_id);
      `);

      console.log('[Migration] Migration v2 completed successfully');
    },
  },
  {
    version: 3,
    name: 'add_form_metadata_schema',
    up: async (db: SQLite.SQLiteDatabase) => {
      console.log('[Migration] Running migration v3: add_form_metadata_schema');

      // Add metadata_schema column to forms table using runAsync
      await db.runAsync('ALTER TABLE forms ADD COLUMN metadata_schema TEXT');

      console.log('[Migration] Migration v3 completed successfully');
    },
  },
  {
    version: 4,
    name: 'update_sync_model',
    up: async (db: SQLite.SQLiteDatabase) => {
      console.log('[Migration] Running migration v4: update_sync_model');

      // Update submissions table
      console.log('[Migration] Updating submissions table...');

      // Create new submissions table with updated schema
      await db.execAsync(`
        CREATE TABLE IF NOT EXISTS submissions_new (
          id TEXT PRIMARY KEY,
          form_id TEXT NOT NULL,
          user_id TEXT,
          metadata TEXT,
          started_at TEXT NOT NULL,
          completed_at TEXT,
          sync_status TEXT NOT NULL DEFAULT 'pending',
          synced_at TEXT,
          created_at TEXT NOT NULL,
          updated_at TEXT NOT NULL,
          FOREIGN KEY (form_id) REFERENCES forms(id),
          FOREIGN KEY (user_id) REFERENCES users(id)
        );
      `);

      // Migrate data from old table to new table
      await db.execAsync(`
        INSERT INTO submissions_new (
          id, form_id, user_id, metadata, started_at, completed_at,
          sync_status, synced_at, created_at, updated_at
        )
        SELECT
          id,
          form_id,
          user_id,
          metadata,
          created_at as started_at,
          CASE WHEN status = 'completed' OR status = 'synced' THEN updated_at ELSE NULL END as completed_at,
          CASE WHEN status = 'synced' THEN 'synced' ELSE 'pending' END as sync_status,
          synced_at,
          created_at,
          updated_at
        FROM submissions;
      `);

      // Drop old table
      await db.execAsync('DROP TABLE submissions;');

      // Rename new table to submissions
      await db.execAsync('ALTER TABLE submissions_new RENAME TO submissions;');

      // Recreate indexes for submissions
      await db.execAsync(`
        CREATE INDEX IF NOT EXISTS idx_submissions_form_id
        ON submissions(form_id);
      `);

      await db.execAsync(`
        CREATE INDEX IF NOT EXISTS idx_submissions_user_id
        ON submissions(user_id);
      `);

      await db.execAsync(`
        CREATE INDEX IF NOT EXISTS idx_submissions_sync_status
        ON submissions(sync_status);
      `);

      await db.execAsync(`
        CREATE INDEX IF NOT EXISTS idx_submissions_user_sync_status
        ON submissions(user_id, sync_status);
      `);

      await db.execAsync(`
        CREATE INDEX IF NOT EXISTS idx_submissions_form_sync_status
        ON submissions(form_id, sync_status);
      `);

      await db.execAsync(`
        CREATE INDEX IF NOT EXISTS idx_submissions_created_at
        ON submissions(created_at DESC);
      `);

      console.log('[Migration] Submissions table updated successfully');

      // Update files table
      console.log('[Migration] Updating files table...');

      // Create new files table with updated schema
      await db.execAsync(`
        CREATE TABLE IF NOT EXISTS files_new (
          id TEXT PRIMARY KEY,
          submission_id TEXT NOT NULL,
          step_id TEXT NOT NULL,
          question_id TEXT,
          local_path TEXT,
          remote_path TEXT,
          file_name TEXT NOT NULL,
          file_size INTEGER NOT NULL,
          mime_type TEXT NOT NULL,
          sync_status TEXT NOT NULL DEFAULT 'pending',
          created_at TEXT NOT NULL,
          FOREIGN KEY (submission_id) REFERENCES submissions(id) ON DELETE CASCADE
        );
      `);

      // Migrate data from old table to new table
      // We need to infer step_id from question_id by joining with questions table
      await db.execAsync(`
        INSERT INTO files_new (
          id, submission_id, step_id, question_id, local_path, remote_path,
          file_name, file_size, mime_type, sync_status, created_at
        )
        SELECT
          f.id,
          f.submission_id,
          COALESCE(q.step_id, 'unknown') as step_id,
          f.question_id,
          f.local_uri as local_path,
          NULL as remote_path,
          f.file_name,
          f.size as file_size,
          f.mime_type,
          CASE WHEN f.status = 'synced' THEN 'synced'
               WHEN f.status = 'error' THEN 'failed'
               ELSE 'pending' END as sync_status,
          f.created_at
        FROM files f
        LEFT JOIN questions q ON f.question_id = q.id;
      `);

      // Drop old table
      await db.execAsync('DROP TABLE files;');

      // Rename new table to files
      await db.execAsync('ALTER TABLE files_new RENAME TO files;');

      // Recreate indexes for files
      await db.execAsync(`
        CREATE INDEX IF NOT EXISTS idx_files_submission_id
        ON files(submission_id);
      `);

      await db.execAsync(`
        CREATE INDEX IF NOT EXISTS idx_files_step_id
        ON files(step_id);
      `);

      await db.execAsync(`
        CREATE INDEX IF NOT EXISTS idx_files_sync_status
        ON files(sync_status);
      `);

      await db.execAsync(`
        CREATE INDEX IF NOT EXISTS idx_files_question_id
        ON files(question_id);
      `);

      console.log('[Migration] Files table updated successfully');
      console.log('[Migration] Migration v4 completed successfully');
    },
  },
  {
    version: 5,
    name: 'add_site_fields_to_forms',
    up: async (db: SQLite.SQLiteDatabase) => {
      console.log('[Migration] Running migration v5: add_site_fields_to_forms');

      // Add site_id column to forms table
      await db.runAsync('ALTER TABLE forms ADD COLUMN site_id TEXT');
      console.log('[Migration] Added site_id column to forms table');

      // Add site_type column to forms table with default value
      await db.runAsync("ALTER TABLE forms ADD COLUMN site_type TEXT NOT NULL DEFAULT 'GREENFIELD'");
      console.log('[Migration] Added site_type column to forms table');

      console.log('[Migration] Migration v5 completed successfully');
    },
  },
];

async function createMigrationsTable(
  db: SQLite.SQLiteDatabase,
): Promise<void> {
  await db.execAsync(`
    CREATE TABLE IF NOT EXISTS ${MIGRATIONS_TABLE} (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      version INTEGER NOT NULL UNIQUE,
      name TEXT NOT NULL,
      applied_at TEXT NOT NULL
    );
  `);
}

async function getCurrentVersion(
  db: SQLite.SQLiteDatabase,
): Promise<number> {
  try {
    const result = await db.getFirstAsync<{version: number}>(
      `SELECT MAX(version) as version FROM ${MIGRATIONS_TABLE}`,
    );

    return result?.version || 0;
  } catch (error) {
    console.log('[Migration] Migrations table does not exist yet');
    return 0;
  }
}

async function recordMigration(
  db: SQLite.SQLiteDatabase,
  version: number,
  name: string,
): Promise<void> {
  const now = new Date().toISOString();
  await db.runAsync(
    `INSERT INTO ${MIGRATIONS_TABLE} (version, name, applied_at) VALUES (?, ?, ?)`,
    [version, name, now],
  );
}

export async function runMigrations(
  db: SQLite.SQLiteDatabase,
): Promise<void> {
  console.log('[Migration] Starting migrations...');

  // Create migrations tracking table
  await createMigrationsTable(db);

  // Get current version
  const currentVersion = await getCurrentVersion(db);
  console.log(`[Migration] Current database version: ${currentVersion}`);

  // Find pending migrations
  const pendingMigrations = migrations.filter(
    m => m.version > currentVersion,
  );

  if (pendingMigrations.length === 0) {
    console.log('[Migration] No pending migrations');
    return;
  }

  console.log(
    `[Migration] Found ${pendingMigrations.length} pending migration(s)`,
  );

  // Run each pending migration
  for (const migration of pendingMigrations) {
    console.log(
      `[Migration] Applying migration v${migration.version}: ${migration.name}`,
    );

    try {
      // Run the migration
      await migration.up(db);

      // Record the migration
      await recordMigration(db, migration.version, migration.name);

      console.log(
        `[Migration] Successfully applied migration v${migration.version}`,
      );
    } catch (error) {
      console.error(
        `[Migration] Error applying migration v${migration.version}:`,
        error,
      );
      throw error;
    }
  }

  console.log('[Migration] All migrations completed successfully');
}

export async function rollbackMigration(
  db: SQLite.SQLiteDatabase,
): Promise<void> {
  const currentVersion = await getCurrentVersion(db);

  if (currentVersion === 0) {
    console.log('[Migration] No migrations to rollback');
    return;
  }

  console.log(
    `[Migration] Rolling back migration v${currentVersion} (WARNING: Not implemented)`,
  );
  // Rollback logic would go here if needed
  // For simplicity, we're using a forward-only migration strategy
}
