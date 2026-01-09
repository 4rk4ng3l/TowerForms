import {IUserRepository} from '@core/repositories/IUserRepository';
import {UserEntity} from '@core/entities/User';
import {Database} from '@infrastructure/database/database';

export class SQLiteUserRepository implements IUserRepository {
  private db: Database;

  constructor() {
    this.db = Database.getInstance();
  }

  async save(user: UserEntity): Promise<void> {
    const sql = `
      INSERT OR REPLACE INTO users (id, email, name, role, created_at)
      VALUES (?, ?, ?, ?, ?)
    `;

    await this.db.executeSql(sql, [
      user.id,
      user.email,
      user.name,
      user.role,
      user.createdAt.toISOString(),
    ]);
  }

  async findById(id: string): Promise<UserEntity | null> {
    const sql = `SELECT * FROM users WHERE id = ? LIMIT 1`;
    const result = await this.db.executeSql(sql, [id]);

    if (result.rows.length === 0) {
      return null;
    }

    return this.mapRowToEntity(result.rows.item(0));
  }

  async findByEmail(email: string): Promise<UserEntity | null> {
    const sql = `SELECT * FROM users WHERE email = ? LIMIT 1`;
    const result = await this.db.executeSql(sql, [email]);

    if (result.rows.length === 0) {
      return null;
    }

    return this.mapRowToEntity(result.rows.item(0));
  }

  async getCurrentUser(): Promise<UserEntity | null> {
    // Get the first user (assuming single user login)
    const sql = `SELECT * FROM users LIMIT 1`;
    const result = await this.db.executeSql(sql, []);

    if (result.rows.length === 0) {
      return null;
    }

    return this.mapRowToEntity(result.rows.item(0));
  }

  async update(user: UserEntity): Promise<void> {
    const sql = `
      UPDATE users
      SET email = ?, name = ?, role = ?
      WHERE id = ?
    `;

    await this.db.executeSql(sql, [user.email, user.name, user.role, user.id]);
  }

  async delete(id: string): Promise<void> {
    const sql = `DELETE FROM users WHERE id = ?`;
    await this.db.executeSql(sql, [id]);
  }

  async clear(): Promise<void> {
    const sql = `DELETE FROM users`;
    await this.db.executeSql(sql, []);
  }

  private mapRowToEntity(row: any): UserEntity {
    return new UserEntity(
      row.id,
      row.email,
      row.name,
      row.role,
      new Date(row.created_at),
    );
  }
}
