export interface ExamDTO {
  examId: number;
  examType: string;
  name: string;
  description: string;
  isActive?: boolean;
  createdBy: number;
  createdByName: string;
  updateBy?: number;
  updateByName?: string;
  createdAt: Date;
  updateAt?: Date;
  examParts?: ExamPartDTO[];
}

export interface ExamPartDTO {
  partId: number;
  examId: number;
  partCode: string;
  title: string;
  orderIndex: number;
  questions: QuestionDTO[];
}

export interface QuestionDTO {
  questionId: number;
  partId: number;
  questionType: string;
  stemText: string;
  promptId?: number;
  scoreWeight: number;
  questionExplain?: string;
  time: number;
  questionNumber: number;
  prompt: PromptDTO;
  options: OptionDTO[];
  sampleAnswer?: string;
}

export interface PromptDTO {
  promptId: number;
  passageId?: number;
  skill: string;
  promptText?: string;
  referenceImageUrl?: string;
  referenceAudioUrl?: string;
  passage: PassageDTO;
}
export interface PartDetailResponse {
  part: ExamPartDTO;

  questions: QuestionDTO[];
}
export interface PassageDTO {
  passageId: number;
  title: string;
  contentText: string;
}

export interface OptionDTO {
  optionId: number;
  questionId: number;
  content: string;
  isCorrect?: boolean;
}

export interface SpeakingScoringResult {
  transcript: string;
  savedAudioUrl: string;
  overallScore: number;
  pronunciationScore: number;
  accuracyScore: number;
  fluencyScore: number;
  completenessScore: number;
  grammarScore: number;
  vocabularyScore: number;
  contentScore: number;
}
