import * as SQLite from 'expo-sqlite';
import {runMigrations} from './migrations';

export type SQLResultSet = {
  rows: {
    length: number;
    item: (index: number) => any;
    _array: any[];
  };
  insertId?: number;
  rowsAffected: number;
};

export class Database {
  private static instance: Database;
  private db: SQLite.SQLiteDatabase | null = null;
  private readonly dbName = 'towerforms.db';

  private constructor() {}

  static getInstance(): Database {
    if (!Database.instance) {
      Database.instance = new Database();
    }
    return Database.instance;
  }

  async init(): Promise<void> {
    try {
      console.log('[Database] Initializing database...');

      this.db = await SQLite.openDatabaseAsync(this.dbName);

      console.log('[Database] Database opened successfully');

      // Run migrations
      await runMigrations(this.db);

      console.log('[Database] Database initialized successfully');
    } catch (error) {
      console.error('[Database] Error initializing database:', error);
      throw error;
    }
  }

  async getConnection(): Promise<SQLite.SQLiteDatabase> {
    if (!this.db) {
      await this.init();
    }
    return this.db!;
  }

  async close(): Promise<void> {
    if (this.db) {
      console.log('[Database] Closing database connection...');
      await this.db.closeAsync();
      this.db = null;
      console.log('[Database] Database closed');
    }
  }

  async executeSql(sql: string, params: any[] = []): Promise<SQLResultSet> {
    const db = await this.getConnection();

    // Check if this is a SELECT query
    const isSelect = sql.trim().toUpperCase().startsWith('SELECT');

    if (isSelect) {
      const rows = await db.getAllAsync(sql, params);
      return {
        rows: {
          length: rows.length,
          item: (index: number) => rows[index],
          _array: rows,
        },
        rowsAffected: 0,
      };
    } else {
      const result = await db.runAsync(sql, params);
      return {
        rows: {
          length: 0,
          item: () => null,
          _array: [],
        },
        insertId: result.lastInsertRowId,
        rowsAffected: result.changes,
      };
    }
  }

  async transaction(
    txFunction: (tx: {executeSql: (sql: string, params?: any[]) => Promise<SQLResultSet>}) => Promise<void>,
  ): Promise<void> {
    const db = await this.getConnection();

    // expo-sqlite doesn't have traditional transactions, so we simulate them
    // by creating a transaction-like object
    const txObject = {
      executeSql: async (sql: string, params: any[] = []): Promise<SQLResultSet> => {
        return this.executeSql(sql, params);
      },
    };

    await txFunction(txObject);
  }

  async dropAllTables(): Promise<void> {
    console.log('[Database] Dropping all tables...');
    const db = await this.getConnection();

    // Get all table names
    const tables = await db.getAllAsync(
      "SELECT name FROM sqlite_master WHERE type='table' AND name NOT LIKE 'sqlite_%'"
    );

    // Drop each table
    for (const table of tables) {
      await db.execAsync(`DROP TABLE IF EXISTS ${table.name}`);
      console.log(`[Database] Dropped table: ${table.name}`);
    }

    console.log('[Database] All tables dropped');
  }
}

// Export singleton instance
export const database = Database.getInstance();
