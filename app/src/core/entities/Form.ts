export interface FormMetadataField {
  type: 'text' | 'date' | 'time' | 'select';
  label: string;
  required: boolean;
  options?: string[];
}

export type FormMetadataSchema = {
  [key: string]: FormMetadataField;
};

export type SiteType = 'GREENFIELD' | 'ROOFTOP' | 'POSTEVIA';

export type SectionType = 'security' | 'inventory' | 'torque';

export interface FormSection {
  required: boolean;
  label?: string;
}

export type FormSections = {
  [key in SectionType]?: FormSection;
};

export interface FormStep {
  id: string;
  stepNumber: number;
  title: string;
  questions: Question[];
}

export interface Question {
  id: string;
  questionText: string;
  type: 'text' | 'multiple_choice' | 'single_choice' | 'file' | 'number' | 'file_upload';
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
  siteId: string | null;
  siteType: SiteType;
  version: number;
  metadataSchema: FormMetadataSchema | null;
  sections: FormSections | null;
  steps: FormStep[];
  createdAt: Date;
  updatedAt: Date;
}
