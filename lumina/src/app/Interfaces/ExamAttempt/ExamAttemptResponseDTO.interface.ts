export interface ExamAttemptResponseDTO {
  attemptID: number;
  userName: string;
  examName: string;
  examPartName: string;
  startTime: string | Date;
  endTime: string | Date | null;
  score: number | null;
  status: string;
}
