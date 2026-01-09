import {Form} from '@core/entities/Form';
import {IFormRepository} from '@core/repositories/IFormRepository';

export class GetAllFormsUseCase {
  constructor(private formRepository: IFormRepository) {}

  async execute(): Promise<Form[]> {
    try {
      console.log('[GetAllFormsUseCase] Fetching forms from local database...');
      const forms = await this.formRepository.getAll();
      console.log(`[GetAllFormsUseCase] Found ${forms.length} forms`);
      return forms;
    } catch (error: any) {
      console.error('[GetAllFormsUseCase] Error fetching forms:', error);
      throw new Error('Failed to load forms from local storage');
    }
  }
}
