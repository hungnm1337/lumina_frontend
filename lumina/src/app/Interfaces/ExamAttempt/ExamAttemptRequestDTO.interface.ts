export interface ExamAttemptRequestDTO {
  attemptID: number;
  userID: number;
  examID: number;
  examPartId: number | null;
  startTime: string | Date;
  endTime: string | Date | null;
  score: number | null;
  status: string;
}
