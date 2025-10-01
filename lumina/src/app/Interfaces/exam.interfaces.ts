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
