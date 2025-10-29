import { QuestionDTO } from "../exam.interfaces";

export interface WritingAnswerResponseDTO {
  userAnswerWritingId: number;
  attemptID: number;
  question: QuestionDTO;
  userAnswerContent: string;
  feedbackFromAI: string;
}
