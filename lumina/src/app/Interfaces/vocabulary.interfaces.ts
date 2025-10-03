// Vocabulary interfaces để match với backend APIs

export interface VocabularyWord {
  id: number;
  listId: number;
  word: string;
  type: string;
  definition: string;
  example?: string;
}

export interface VocabularyListCreate {
  name: string;
  isPublic: boolean;
}

export interface VocabularyListResponse {
  vocabularyListId: number;
  name: string;
  isPublic: boolean | null;
  makeByName: string;
  createAt: string;
  vocabularyCount: number;
}

export interface VocabularyStats {
  listId: number;
  total: number;
}

// Interface cho component (để tương thích với UI hiện tại)
export interface Vocabulary {
  id: number;
  word: string;
  pronunciation: string;
  category: string;
  partOfSpeech: string;
  definition: string;
  example: string;
  translation: string;
  difficulty: 'Beginner' | 'Intermediate' | 'Advanced';
  createdDate: string;
  createdBy: string;
  status: 'active' | 'inactive';
}

export interface VocabularyCategory {
  id: string;
  name: string;
  icon: string;
  count: number;
  color: string;
}

