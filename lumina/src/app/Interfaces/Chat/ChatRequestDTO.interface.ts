export interface ChatRequestDTO {
  message: string;
  userId: number;
  conversationType: string; // "vocabulary", "grammar", "toeic_strategy", "practice", "general"
}
