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
  imageDescription?: string; // Mô tả ảnh để tạo ảnh tự động
  imageUrl?: string; // URL ảnh đã được tạo (Pollinations AI)
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
  imageDescription?: string; // Mô tả ảnh cho từng từ vựng
  imageUrl?: string; // URL ảnh đã được tạo (Pollinations AI)
  imageError?: boolean; // Flag để track lỗi load ảnh
}

export interface SaveVocabularyRequestDTO {
  userId: number;
  folderName: string;
  vocabularies: GeneratedVocabularyDTO[];
  imageUrl?: string; // URL ảnh từ Pollinations AI hoặc Cloudinary
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
  imageUrl?: string; // URL ảnh từ Pollinations AI hoặc Cloudinary
}
