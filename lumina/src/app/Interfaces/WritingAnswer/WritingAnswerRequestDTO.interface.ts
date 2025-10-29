export interface WritingAnswerRequestDTO {
  userAnswerWritingId: number;
  attemptID: number;
  questionId: number;
  userAnswerContent: string;
  feedbackFromAI: string;
}
