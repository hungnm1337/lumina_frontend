export interface ChatRequestDTO {
  message: string;
  userId: number;
  conversationType: string;
}

export interface ChatResponseDTO {
  answer: string;
  suggestions: string[];
  examples: string[];
  relatedWords: string[];
  conversationType: string;
  hasSaveOption: boolean;
  saveAction?: string;
  vocabularies?: GeneratedVocabularyDTO[];
  // Thêm properties cho out_of_scope
  isOutOfScope?: boolean;
  scopeMessage?: string;
}

export interface GeneratedVocabularyDTO {
  word: string;
  definition: string;
  example: string;
  typeOfWord: string;
  category: string;
}

export interface SaveVocabularyRequestDTO {
  userId: number;
  folderName: string;
  vocabularies: GeneratedVocabularyDTO[];
}

export interface SaveVocabularyResponseDTO {
  success: boolean;
  message: string;
  vocabularyListId: number;
  vocabularyCount: number;
}

export interface ChatMessage {
  type: 'user' | 'ai';
  content: string;
  timestamp: Date;
  conversationType?: string;
  suggestions?: string[];
  examples?: string[];
  relatedWords?: string[];
  vocabularies?: GeneratedVocabularyDTO[];
  hasSaveOption?: boolean;
}
