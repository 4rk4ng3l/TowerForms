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
    questionId: string,
    uri: string,
    fileName: string,
    mimeType: string,
    size: number,
    base64Data?: string,
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
    questionId: string,
    uri: string,
    fileName: string,
    mimeType: string,
    size: number,
    base64Data?: string,
  ) => {
    set({isLoading: true, error: null});
    try {
      const file = await addFileUseCase.execute(
        submissionId,
        questionId,
        uri,
        fileName,
        mimeType,
        size,
        base64Data,
      );

      // Add to state
      const currentFiles = get().files[questionId] || [];
      set({
        files: {
          ...get().files,
          [questionId]: [...currentFiles, file],
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
