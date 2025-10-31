import { QuestionDTO } from "../exam.interfaces";

export interface SpeakingAnswerResponseDTO {
  userAnswerSpeakingId: number;
  attemptID: number;
  question: QuestionDTO;
  transcript: string;
  audioUrl: string;
  pronunciationScore: number | null;
  accuracyScore: number | null;
  fluencyScore: number | null;
  completenessScore: number | null;
  grammarScore: number | null;
  vocabularyScore: number | null;
  contentScore: number | null;
  overallScore: number | null;
}
