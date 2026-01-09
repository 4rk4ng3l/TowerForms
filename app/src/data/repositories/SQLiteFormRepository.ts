import {IFormRepository} from '@core/repositories/IFormRepository';
import {Form, FormStep, Question} from '@core/entities/Form';
import {Database} from '@infrastructure/database/database';

export class SQLiteFormRepository implements IFormRepository {
  private db: Database;

  constructor() {
    this.db = Database.getInstance();
  }

  async getById(id: string): Promise<Form | null> {
    const sql = `SELECT * FROM forms WHERE id = ? LIMIT 1`;
    const result = await this.db.executeSql(sql, [id]);

    if (result.rows.length === 0) {
      return null;
    }

    const formRow = result.rows.item(0);
    const steps = await this.getFormSteps(id);

    return this.mapRowToForm(formRow, steps);
  }

  async getAll(): Promise<Form[]> {
    const sql = `SELECT * FROM forms ORDER BY created_at DESC`;
    const result = await this.db.executeSql(sql, []);

    const forms: Form[] = [];
    for (let i = 0; i < result.rows.length; i++) {
      const formRow = result.rows.item(i);
      const steps = await this.getFormSteps(formRow.id);
      forms.push(this.mapRowToForm(formRow, steps));
    }

    return forms;
  }

  async save(form: Form): Promise<void> {
    await this.db.transaction(async tx => {
      // Insert or replace form
      const formSql = `
        INSERT OR REPLACE INTO forms (id, name, description, version, created_at, updated_at)
        VALUES (?, ?, ?, ?, ?, ?)
      `;

      await tx.executeSql(formSql, [
        form.id,
        form.name,
        form.description,
        form.version,
        form.createdAt.toISOString(),
        form.updatedAt.toISOString(),
      ]);

      // Delete existing steps (cascade will delete questions)
      await tx.executeSql('DELETE FROM form_steps WHERE form_id = ?', [
        form.id,
      ]);

      // Insert steps and questions
      for (const step of form.steps) {
        await this.saveFormStep(tx, form.id, step);
      }
    });
  }

  async delete(id: string): Promise<void> {
    await this.db.transaction(async tx => {
      // Delete form (cascade will delete steps and questions)
      await tx.executeSql('DELETE FROM forms WHERE id = ?', [id]);
    });
  }

  async syncFromRemote(): Promise<Form[]> {
    // This will be implemented with the SyncFormsUseCase
    // For now, return empty array
    return [];
  }

  private async saveFormStep(
    tx: any,
    formId: string,
    step: FormStep,
  ): Promise<void> {
    // Insert step
    const stepSql = `
      INSERT OR REPLACE INTO form_steps (id, form_id, step_number, title)
      VALUES (?, ?, ?, ?)
    `;

    await tx.executeSql(stepSql, [
      step.id,
      formId,
      step.stepNumber,
      step.title,
    ]);

    // Insert questions
    for (const question of step.questions) {
      await this.saveQuestion(tx, step.id, question);
    }
  }

  private async saveQuestion(
    tx: any,
    stepId: string,
    question: Question,
  ): Promise<void> {
    const sql = `
      INSERT OR REPLACE INTO questions (
        id, step_id, question_text, type, options, is_required, order_number, metadata
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `;

    await tx.executeSql(sql, [
      question.id,
      stepId,
      question.questionText,
      question.type,
      question.options ? JSON.stringify(question.options) : null,
      question.isRequired ? 1 : 0,
      question.orderNumber,
      question.metadata ? JSON.stringify(question.metadata) : null,
    ]);
  }

  private async getFormSteps(formId: string): Promise<FormStep[]> {
    const sql = `
      SELECT * FROM form_steps
      WHERE form_id = ?
      ORDER BY step_number ASC
    `;
    const result = await this.db.executeSql(sql, [formId]);

    const steps: FormStep[] = [];
    for (let i = 0; i < result.rows.length; i++) {
      const stepRow = result.rows.item(i);
      const questions = await this.getStepQuestions(stepRow.id);

      steps.push({
        id: stepRow.id,
        stepNumber: stepRow.step_number,
        title: stepRow.title,
        questions,
      });
    }

    return steps;
  }

  private async getStepQuestions(stepId: string): Promise<Question[]> {
    const sql = `
      SELECT * FROM questions
      WHERE step_id = ?
      ORDER BY order_number ASC
    `;
    const result = await this.db.executeSql(sql, [stepId]);

    const questions: Question[] = [];
    for (let i = 0; i < result.rows.length; i++) {
      const row = result.rows.item(i);
      questions.push({
        id: row.id,
        questionText: row.question_text,
        type: row.type,
        options: row.options ? JSON.parse(row.options) : null,
        isRequired: row.is_required === 1,
        orderNumber: row.order_number,
        metadata: row.metadata ? JSON.parse(row.metadata) : undefined,
      });
    }

    return questions;
  }

  private mapRowToForm(row: any, steps: FormStep[]): Form {
    return {
      id: row.id,
      name: row.name,
      description: row.description,
      version: row.version,
      steps,
      createdAt: new Date(row.created_at),
      updatedAt: new Date(row.updated_at),
    };
  }
}
