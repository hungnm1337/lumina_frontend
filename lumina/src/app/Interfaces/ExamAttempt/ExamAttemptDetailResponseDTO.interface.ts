import { ReadingAnswerResponseDTO } from "../ReadingAnswer/ReadingAnswerResponseDTO.interface";
import { WritingAnswerResponseDTO } from "../WritingAnswer/WritingAnswerResponseDTO.interface";
import { SpeakingAnswerResponseDTO } from "../SpeakingAnswer/SpeakingAnswerResponseDTO.interface";
import { ExamAttemptResponseDTO } from "./ExamAttemptResponseDTO.interface";

export interface ExamAttemptDetailResponseDTO {
  examAttemptInfo: ExamAttemptResponseDTO | null;
  readingAnswers: ReadingAnswerResponseDTO[] | null;
  writingAnswers: WritingAnswerResponseDTO[] | null;
  speakingAnswers: SpeakingAnswerResponseDTO[] | null;
}
