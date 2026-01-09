import {create} from 'zustand';
import {Form} from '@core/entities/Form';
import {SyncFormsUseCase} from '@core/use-cases/forms/SyncFormsUseCase';
import {GetAllFormsUseCase} from '@core/use-cases/forms/GetAllFormsUseCase';
import {GetFormByIdUseCase} from '@core/use-cases/forms/GetFormByIdUseCase';
import {ApiClient} from '@data/api/apiClient';
import {SQLiteFormRepository} from '@data/repositories/SQLiteFormRepository';

interface FormsState {
  forms: Form[];
  currentForm: Form | null;
  isLoading: boolean;
  isSyncing: boolean;
  error: string | null;
  lastSyncAt: Date | null;
}

interface FormsActions {
  loadForms: () => Promise<void>;
  syncForms: () => Promise<void>;
  getFormById: (id: string) => Promise<Form | null>;
  setCurrentForm: (form: Form | null) => void;
  clearError: () => void;
}

type FormsStore = FormsState & FormsActions;

// Initialize dependencies
const apiClient = ApiClient.getInstance();
const formRepository = new SQLiteFormRepository();

const syncFormsUseCase = new SyncFormsUseCase(apiClient, formRepository);
const getAllFormsUseCase = new GetAllFormsUseCase(formRepository);
const getFormByIdUseCase = new GetFormByIdUseCase(formRepository);

export const useFormsStore = create<FormsStore>((set, get) => ({
  // Initial state
  forms: [],
  currentForm: null,
  isLoading: false,
  isSyncing: false,
  error: null,
  lastSyncAt: null,

  // Actions
  loadForms: async () => {
    set({isLoading: true, error: null});
    try {
      const forms = await getAllFormsUseCase.execute();
      set({
        forms,
        isLoading: false,
        error: null,
      });
    } catch (error: any) {
      set({
        isLoading: false,
        error: error.message || 'Failed to load forms',
      });
      throw error;
    }
  },

  syncForms: async () => {
    set({isSyncing: true, error: null});
    try {
      const forms = await syncFormsUseCase.execute();
      set({
        forms,
        isSyncing: false,
        error: null,
        lastSyncAt: new Date(),
      });
    } catch (error: any) {
      set({
        isSyncing: false,
        error: error.message || 'Failed to sync forms',
      });
      throw error;
    }
  },

  getFormById: async (id: string) => {
    try {
      const form = await getFormByIdUseCase.execute(id);
      return form;
    } catch (error: any) {
      set({
        error: error.message || 'Failed to load form',
      });
      throw error;
    }
  },

  setCurrentForm: (form: Form | null) => {
    set({currentForm: form});
  },

  clearError: () => {
    set({error: null});
  },
}));
