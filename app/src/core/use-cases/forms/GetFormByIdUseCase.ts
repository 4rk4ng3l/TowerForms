import {Form} from '@core/entities/Form';
import {IFormRepository} from '@core/repositories/IFormRepository';

export class GetFormByIdUseCase {
  constructor(private formRepository: IFormRepository) {}

  async execute(formId: string): Promise<Form | null> {
    try {
      console.log(`[GetFormByIdUseCase] Fetching form ${formId}...`);
      const form = await this.formRepository.getById(formId);

      if (!form) {
        console.log(`[GetFormByIdUseCase] Form ${formId} not found`);
        return null;
      }

      console.log(`[GetFormByIdUseCase] Found form: ${form.name}`);
      return form;
    } catch (error: any) {
      console.error('[GetFormByIdUseCase] Error fetching form:', error);
      throw new Error('Failed to load form from local storage');
    }
  }
}
