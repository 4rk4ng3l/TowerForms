import {create} from 'zustand';
import {SubmissionEntity, Answer, SubmissionMetadata} from '@core/entities/Submission';
import {CreateSubmissionUseCase} from '@core/use-cases/submissions/CreateSubmissionUseCase';
import {UpdateSubmissionUseCase} from '@core/use-cases/submissions/UpdateSubmissionUseCase';
import {UpdateSubmissionMetadataUseCase} from '@core/use-cases/submissions/UpdateSubmissionMetadataUseCase';
import {CompleteSubmissionUseCase} from '@core/use-cases/submissions/CompleteSubmissionUseCase';
import {GetSubmissionUseCase} from '@core/use-cases/submissions/GetSubmissionUseCase';
import {SQLiteSubmissionRepository} from '@data/repositories/SQLiteSubmissionRepository';

interface SubmissionsState {
  currentSubmission: SubmissionEntity | null;
  isLoading: boolean;
  error: string | null;
}

interface SubmissionsActions {
  createSubmission: (formId: string, userId: string) => Promise<SubmissionEntity>;
  loadSubmission: (submissionId: string) => Promise<void>;
  updateAnswer: (submissionId: string, answer: Answer) => Promise<void>;
  updateMetadata: (submissionId: string, metadata: Partial<SubmissionMetadata>) => Promise<void>;
  completeSubmission: (submissionId: string) => Promise<void>;
  clearCurrentSubmission: () => void;
  clearError: () => void;
}

type SubmissionsStore = SubmissionsState & SubmissionsActions;

// Initialize dependencies
const submissionRepository = new SQLiteSubmissionRepository();
const createSubmissionUseCase = new CreateSubmissionUseCase(submissionRepository);
const updateSubmissionUseCase = new UpdateSubmissionUseCase(submissionRepository);
const updateSubmissionMetadataUseCase = new UpdateSubmissionMetadataUseCase(submissionRepository);
const completeSubmissionUseCase = new CompleteSubmissionUseCase(submissionRepository);
const getSubmissionUseCase = new GetSubmissionUseCase(submissionRepository);

export const useSubmissionsStore = create<SubmissionsStore>((set, get) => ({
  // Initial state
  currentSubmission: null,
  isLoading: false,
  error: null,

  // Actions
  createSubmission: async (formId: string, userId: string) => {
    set({isLoading: true, error: null});
    try {
      const submission = await createSubmissionUseCase.execute(formId, userId);
      set({
        currentSubmission: submission,
        isLoading: false,
        error: null,
      });
      return submission;
    } catch (error: any) {
      set({
        isLoading: false,
        error: error.message || 'Failed to create submission',
      });
      throw error;
    }
  },

  loadSubmission: async (submissionId: string) => {
    set({isLoading: true, error: null});
    try {
      const submission = await getSubmissionUseCase.execute(submissionId);
      set({
        currentSubmission: submission,
        isLoading: false,
        error: null,
      });
    } catch (error: any) {
      set({
        isLoading: false,
        error: error.message || 'Failed to load submission',
      });
      throw error;
    }
  },

  updateAnswer: async (submissionId: string, answer: Answer) => {
    set({isLoading: true, error: null});
    try {
      const updatedSubmission = await updateSubmissionUseCase.execute(
        submissionId,
        answer,
      );
      set({
        currentSubmission: updatedSubmission,
        isLoading: false,
        error: null,
      });
    } catch (error: any) {
      set({
        isLoading: false,
        error: error.message || 'Failed to update answer',
      });
      throw error;
    }
  },

  updateMetadata: async (submissionId: string, metadata: Partial<SubmissionMetadata>) => {
    set({isLoading: true, error: null});
    try {
      const updatedSubmission = await updateSubmissionMetadataUseCase.execute(
        submissionId,
        metadata,
      );
      set({
        currentSubmission: updatedSubmission,
        isLoading: false,
        error: null,
      });
    } catch (error: any) {
      set({
        isLoading: false,
        error: error.message || 'Failed to update metadata',
      });
      throw error;
    }
  },

  completeSubmission: async (submissionId: string) => {
    set({isLoading: true, error: null});
    try {
      const completedSubmission = await completeSubmissionUseCase.execute(
        submissionId,
      );
      set({
        currentSubmission: completedSubmission,
        isLoading: false,
        error: null,
      });
    } catch (error: any) {
      set({
        isLoading: false,
        error: error.message || 'Failed to complete submission',
      });
      throw error;
    }
  },

  clearCurrentSubmission: () => {
    set({currentSubmission: null, error: null});
  },

  clearError: () => {
    set({error: null});
  },
}));
