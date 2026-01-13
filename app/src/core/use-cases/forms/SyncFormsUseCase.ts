import {Form} from '@core/entities/Form';
import {IFormRepository} from '@core/repositories/IFormRepository';
import {ApiClient} from '@data/api/apiClient';

export class SyncFormsUseCase {
  constructor(
    private apiClient: ApiClient,
    private formRepository: IFormRepository,
  ) {}

  async execute(): Promise<Form[]> {
    try {
      console.log('[SyncFormsUseCase] Fetching forms from API...');

      // Fetch forms from API
      const formsData = await this.apiClient.getForms();

      console.log(`[SyncFormsUseCase] Fetched ${formsData.length} forms`);
      console.log('[SyncFormsUseCase] Raw API data:', JSON.stringify(formsData, null, 2));

      // Convert API data to Form entities and save to database
      const forms: Form[] = [];

      for (const formData of formsData) {
        const form = this.mapApiDataToForm(formData);
        console.log(`[SyncFormsUseCase] Saving form ${form.id}:`, {
          name: form.name,
          version: form.version,
          metadataSchema: form.metadataSchema,
          siteId: form.siteId,
          siteType: form.siteType
        });
        await this.formRepository.save(form);
        forms.push(form);
      }

      console.log('[SyncFormsUseCase] Forms synced successfully');

      return forms;
    } catch (error: any) {
      console.error('[SyncFormsUseCase] Error syncing forms:', error);
      throw new Error(
        error.response?.data?.error?.message ||
          'Failed to sync forms. Please try again.',
      );
    }
  }

  private mapApiDataToForm(data: any): Form {
    console.log('[SyncFormsUseCase] Mapping API data for form:', data.id);
    console.log('[SyncFormsUseCase] metadataSchema from API:', data.metadataSchema);
    console.log('[SyncFormsUseCase] metadata_schema from API:', data.metadata_schema);

    return {
      id: data.id,
      name: data.name,
      description: data.description || null,
      siteId: data.siteId || data.site_id || null,
      siteType: data.siteType || data.site_type || 'GREENFIELD',
      version: data.version || 1,
      metadataSchema: data.metadataSchema || data.metadata_schema || null,
      steps: (data.steps || []).map((step: any) => ({
        id: step.id,
        stepNumber: step.stepNumber,
        title: step.title,
        questions: (step.questions || []).map((question: any) => ({
          id: question.id,
          questionText: question.questionText,
          type: question.type,
          options: question.options || null,
          isRequired: question.isRequired || false,
          orderNumber: question.orderNumber,
          metadata: question.metadata || undefined,
        })),
      })),
      createdAt: data.createdAt ? new Date(data.createdAt) : new Date(),
      updatedAt: data.updatedAt ? new Date(data.updatedAt) : new Date(),
    };
  }
}
