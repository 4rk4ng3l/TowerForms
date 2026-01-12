import {create} from 'zustand';
import {FileEntity} from '@core/entities/File';
import {AddFileUseCase} from '@core/use-cases/files/AddFileUseCase';
import {GetFilesForQuestionUseCase} from '@core/use-cases/files/GetFilesForQuestionUseCase';
import {DeleteFileUseCase} from '@core/use-cases/files/DeleteFileUseCase';
import {SQLiteFileRepository} from '@data/repositories/SQLiteFileRepository';

interface FilesState {
  files: {[questionId: string]: FileEntity[]};
  isLoading: boolean;
  error: string | null;
}

interface FilesActions {
  addFile: (
    submissionId: string,
    stepId: string,
    questionId: string | null,
    uri: string,
    fileName: string,
    mimeType: string,
    size: number,
  ) => Promise<FileEntity>;
  loadFilesForQuestion: (
    submissionId: string,
    questionId: string,
  ) => Promise<void>;
  deleteFile: (fileId: string, questionId: string) => Promise<void>;
  clearFiles: () => void;
  clearError: () => void;
}

type FilesStore = FilesState & FilesActions;

// Initialize dependencies
const fileRepository = new SQLiteFileRepository();
const addFileUseCase = new AddFileUseCase(fileRepository);
const getFilesForQuestionUseCase = new GetFilesForQuestionUseCase(fileRepository);
const deleteFileUseCase = new DeleteFileUseCase(fileRepository);

export const useFilesStore = create<FilesStore>((set, get) => ({
  // Initial state
  files: {},
  isLoading: false,
  error: null,

  // Actions
  addFile: async (
    submissionId: string,
    stepId: string,
    questionId: string | null,
    uri: string,
    fileName: string,
    mimeType: string,
    size: number,
  ) => {
    set({isLoading: true, error: null});
    try {
      const file = await addFileUseCase.execute(
        submissionId,
        stepId,
        questionId,
        uri,
        fileName,
        mimeType,
        size,
      );

      // Add to state - use questionId as key, or 'general' if null
      const stateKey = questionId || 'general';
      const currentFiles = get().files[stateKey] || [];
      set({
        files: {
          ...get().files,
          [stateKey]: [...currentFiles, file],
        },
        isLoading: false,
        error: null,
      });

      return file;
    } catch (error: any) {
      set({
        isLoading: false,
        error: error.message || 'Failed to add file',
      });
      throw error;
    }
  },

  loadFilesForQuestion: async (submissionId: string, questionId: string) => {
    set({isLoading: true, error: null});
    try {
      const files = await getFilesForQuestionUseCase.execute(
        submissionId,
        questionId,
      );

      set({
        files: {
          ...get().files,
          [questionId]: files,
        },
        isLoading: false,
        error: null,
      });
    } catch (error: any) {
      set({
        isLoading: false,
        error: error.message || 'Failed to load files',
      });
      throw error;
    }
  },

  deleteFile: async (fileId: string, questionId: string) => {
    set({isLoading: true, error: null});
    try {
      await deleteFileUseCase.execute(fileId);

      // Remove from state
      const currentFiles = get().files[questionId] || [];
      set({
        files: {
          ...get().files,
          [questionId]: currentFiles.filter(f => f.id !== fileId),
        },
        isLoading: false,
        error: null,
      });
    } catch (error: any) {
      set({
        isLoading: false,
        error: error.message || 'Failed to delete file',
      });
      throw error;
    }
  },

  clearFiles: () => {
    set({files: {}, error: null});
  },

  clearError: () => {
    set({error: null});
  },
}));
