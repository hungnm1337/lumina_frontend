
export interface ChatMessageDTO {

  Role: 'user' | 'assistant';


  Content: string;

  Timestamp: string;
}

export interface ChatRequestDTO {

  UserQuestion: string;


  LessonContent: string;

  ConversationHistory?: ChatMessageDTO[];


  LessonTitle?: string;

  UserId?: number;

  ArticleId?: number;
}

// Gợi ý tên tệp: src/app/models/chat.models.ts
// (Thêm vào tệp từ yêu cầu trước)

/**
 * Tin nhắn trò chuyện riêng lẻ cho lịch sử hội thoại
 * (Interface này từ yêu cầu trước, cần thiết cho ChatConversationResponseDTO)
 */
export interface ChatMessageDTO {
  /**
   * Vai trò: "user" hoặc "assistant"
   */
  Role: 'user' | 'assistant';

  /**
   * Nội dung tin nhắn
   */
  Content: string;

  /**
   * Dấu thời gian của tin nhắn (thường là chuỗi ISO 8601)
   */
  Timestamp: string;
}


export interface ChatResponseDTO {

  Answer: string;

  ConfidenceScore: number;

  SuggestedQuestions: string[];

  RelatedTopics: string[];

  Timestamp: string;

  Success: boolean;

  ErrorMessage?: string;
}

export interface ChatConversationResponseDTO {
  CurrentResponse: ChatResponseDTO;

  ConversationHistory: ChatMessageDTO[];

  SessionId: string;
}

export interface UserNoteRequestDTO {
  noteId: number;
  articleId: number;
  userId: number;
  sectionId: number;
  noteContent: string;
}
export interface UserNoteResponseDTO {
  noteId: number;
  user: string;
  userId: number;
  articleId: number;
  sectionId: number;
  section: string;
  article: string;
  noteContent: string;
  createAt: string;
  updateAt: string;
}
