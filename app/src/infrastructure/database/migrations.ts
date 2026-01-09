import * as SQLite from 'expo-sqlite';

interface Migration {
  version: number;
  name: string;
  up: (db: SQLite.SQLiteDatabase) => Promise<void>;
}

const MIGRATIONS_TABLE = 'migrations';
const CURRENT_VERSION = 2;

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
