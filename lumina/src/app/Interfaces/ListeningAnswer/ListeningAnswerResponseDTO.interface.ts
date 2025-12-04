import { OptionDTO, QuestionDTO } from "../exam.interfaces";

export interface ListeningAnswerResponseDTO {
  attemptID: number;
  question: QuestionDTO;
  selectedOption: OptionDTO;
  score: number | null;
  isCorrect: boolean;
}
