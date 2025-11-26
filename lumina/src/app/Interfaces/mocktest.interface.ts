export interface MockTestPart {
  examId: number;
  skillType: 'listening' | 'reading' | 'speaking' | 'writing';
  name: string;
  timeLimit?: number; // minutes
  isCompleted: boolean;
}

export interface MockTestAttemptRequest {
  userId: number;
  examIds: number[];
  attemptType: string;
  startTime: Date;
}

export interface MockTestAttemptResponse {
  examAttemptId: number;
  userId: number;
  startTime: Date;
  status: string;
}

export interface PartAnswersSubmission {
  examAttemptId: number;
  examId: number;
  answers: PartAnswer[];
}

export interface PartAnswer {
  questionId: number;
  userAnswer: string;
  isCorrect?: boolean;
}

export interface MockTestResultDTO {
  examAttemptId: number;
  totalScore: number;
  listeningScore: number;
  readingScore: number;
  speakingLevel: string;
  writingLevel: string;
  completionTime: number; // minutes
  partResults: PartResultDTO[];
  analysis?: PerformanceAnalysisDTO;
}

export interface PartResultDTO {
  examId: number;
  skillType: string;
  score: number;
  correctAnswers: number;
  totalQuestions: number;
  timeSpent: number;
}

export interface PerformanceAnalysisDTO {
  strengths: string[];
  weaknesses: string[];
  recommendations: string[];
  percentileRank?: number;
}

export interface MocktestFeedbackDTO {
  overview: string;
  toeicScore: number;
  strengths: string[];
  weaknesses: string[];
  actionPlan: string;
}
