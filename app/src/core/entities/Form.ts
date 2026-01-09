export interface FormStep {
  id: string;
  stepNumber: number;
  title: string;
  questions: Question[];
}

export interface Question {
  id: string;
  questionText: string;
  type: 'text' | 'multiple_choice' | 'single_choice' | 'file';
  options: string[] | null;
  isRequired: boolean;
  orderNumber: number;
  metadata?: {
    maxFiles?: number;
    acceptedTypes?: string[];
  };
}

export interface Form {
  id: string;
  name: string;
  description: string | null;
  version: number;
  steps: FormStep[];
  createdAt: Date;
  updatedAt: Date;
}
