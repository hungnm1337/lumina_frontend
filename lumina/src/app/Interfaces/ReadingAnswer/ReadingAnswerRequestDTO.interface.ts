export interface ReadingAnswerRequestDTO {
  attemptID: number;
  questionId: number;
  selectedOptionId: number | null;
  score: number | null;
  isCorrect: boolean;
}
