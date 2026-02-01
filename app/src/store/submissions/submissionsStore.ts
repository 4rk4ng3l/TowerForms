import {create} from 'zustand';
import {SubmissionEntity, Answer, SubmissionMetadata} from '@core/entities/Submission';
import {CreateSubmissionUseCase} from '@core/use-cases/submissions/CreateSubmissionUseCase';
import {UpdateSubmissionUseCase} from '@core/use-cases/submissions/UpdateSubmissionUseCase';
import {UpdateSubmissionMetadataUseCase} from '@core/use-cases/submissions/UpdateSubmissionMetadataUseCase';
import {CompleteSubmissionUseCase} from '@core/use-cases/submissions/CompleteSubmissionUseCase';
import {GetSubmissionUseCase} from '@core/use-cases/submissions/GetSubmissionUseCase';
import {GetAllSubmissionsUseCase} from '@core/use-cases/submissions/GetAllSubmissionsUseCase';
import {GetCompletedSubmissionsUseCase} from '@core/use-cases/submissions/GetCompletedSubmissionsUseCase';
import {SyncSubmissionsUseCase} from '@core/use-cases/submissions/SyncSubmissionsUseCase';
import {FetchRemoteSubmissionsUseCase} from '@core/use-cases/submissions/FetchRemoteSubmissionsUseCase';
import {SQLiteSubmissionRepository} from '@data/repositories/SQLiteSubmissionRepository';
import {SQLiteFileRepository} from '@data/repositories/SQLiteFileRepository';

interface SyncProgress {
  phase: 'idle' | 'submissions' | 'files';
  current: number;
  total: number;
  currentItem: string;
}

interface SyncResult {
  syncedCount: number;
  failedCount: number;
  filesUploaded: number;
  filesFailed: number;
  errors: any[];
}

interface SubmissionsState {
  currentSubmission: SubmissionEntity | null;
  submissions: SubmissionEntity[];
  completedSubmissions: SubmissionEntity[];
  isLoading: boolean;
  isSyncing: boolean;
  syncProgress: SyncProgress;
  error: string | null;
}

interface SubmissionsActions {
  createSubmission: (formId: string, userId: string) => Promise<SubmissionEntity>;
  loadSubmission: (submissionId: string) => Promise<void>;
  loadAllSubmissions: () => Promise<void>;
  loadCompletedSubmissions: () => Promise<void>;
  updateAnswer: (submissionId: string, answer: Answer) => Promise<void>;
  updateMetadata: (submissionId: string, metadata: Partial<SubmissionMetadata>) => Promise<void>;
  completeSubmission: (submissionId: string) => Promise<void>;
  syncSubmissions: () => Promise<SyncResult>;
  fetchRemoteSubmissions: () => Promise<{fetchedCount: number; updatedCount: number; errors: any[]}>;
  clearCurrentSubmission: () => void;
  clearError: () => void;
}

type SubmissionsStore = SubmissionsState & SubmissionsActions;

// Initialize dependencies
const submissionRepository = new SQLiteSubmissionRepository();
const fileRepository = new SQLiteFileRepository();
const createSubmissionUseCase = new CreateSubmissionUseCase(submissionRepository);
const updateSubmissionUseCase = new UpdateSubmissionUseCase(submissionRepository);
const updateSubmissionMetadataUseCase = new UpdateSubmissionMetadataUseCase(submissionRepository);
const completeSubmissionUseCase = new CompleteSubmissionUseCase(submissionRepository);
const getSubmissionUseCase = new GetSubmissionUseCase(submissionRepository);
const getAllSubmissionsUseCase = new GetAllSubmissionsUseCase(submissionRepository);
const getCompletedSubmissionsUseCase = new GetCompletedSubmissionsUseCase(submissionRepository);
const syncSubmissionsUseCase = new SyncSubmissionsUseCase(submissionRepository, fileRepository);
const fetchRemoteSubmissionsUseCase = new FetchRemoteSubmissionsUseCase(submissionRepository);

export const useSubmissionsStore = create<SubmissionsStore>((set, get) => ({
  // Initial state
  currentSubmission: null,
  submissions: [],
  completedSubmissions: [],
  isLoading: false,
  isSyncing: false,
  syncProgress: {
    phase: 'idle',
    current: 0,
    total: 0,
    currentItem: '',
  },
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

  loadAllSubmissions: async () => {
    set({isLoading: true, error: null});
    try {
      const submissions = await getAllSubmissionsUseCase.execute();
      set({
        submissions,
        isLoading: false,
        error: null,
      });
    } catch (error: any) {
      set({
        isLoading: false,
        error: error.message || 'Failed to load submissions',
      });
      throw error;
    }
  },

  loadCompletedSubmissions: async () => {
    set({isLoading: true, error: null});
    try {
      const completedSubmissions = await getCompletedSubmissionsUseCase.execute();
      set({
        completedSubmissions,
        isLoading: false,
        error: null,
      });
    } catch (error: any) {
      set({
        isLoading: false,
        error: error.message || 'Failed to load completed submissions',
      });
      throw error;
    }
  },

  syncSubmissions: async () => {
    set({
      isSyncing: true,
      error: null,
      syncProgress: {phase: 'submissions', current: 0, total: 0, currentItem: ''},
    });
    try {
      console.log('[SubmissionsStore] Starting sync...');

      const result = await syncSubmissionsUseCase.execute({
        onSubmissionProgress: (current, total, submissionId) => {
          set({
            syncProgress: {
              phase: 'submissions',
              current,
              total,
              currentItem: submissionId,
            },
          });
        },
        onFileProgress: (current, total, fileName) => {
          set({
            syncProgress: {
              phase: 'files',
              current,
              total,
              currentItem: fileName,
            },
          });
        },
      });

      // Reload completed submissions to reflect updated sync status
      await get().loadCompletedSubmissions();

      set({
        isSyncing: false,
        error: null,
        syncProgress: {phase: 'idle', current: 0, total: 0, currentItem: ''},
      });
      console.log('[SubmissionsStore] Sync completed:', result);

      return result;
    } catch (error: any) {
      set({
        isSyncing: false,
        error: error.message || 'Failed to sync submissions',
        syncProgress: {phase: 'idle', current: 0, total: 0, currentItem: ''},
      });
      throw error;
    }
  },

  fetchRemoteSubmissions: async () => {
    set({isSyncing: true, error: null});
    try {
      console.log('[SubmissionsStore] Fetching remote submissions...');
      const result = await fetchRemoteSubmissionsUseCase.execute();

      // Reload completed submissions to show fetched submissions
      await get().loadCompletedSubmissions();

      set({isSyncing: false, error: null});
      console.log('[SubmissionsStore] Fetch completed:', result);

      return result;
    } catch (error: any) {
      set({
        isSyncing: false,
        error: error.message || 'Failed to fetch remote submissions',
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
