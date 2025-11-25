export interface ActiveUsersDTO {
  activeUsersNow: number;
  totalUsers: number;
  newUsersThisWeek: number;
  newUsersThisMonth: number;
  growthRate: number;
}

export interface TopArticleDTO {
  articleId: number;
  title: string;
  viewCount: number;
  readerCount: number;
  averageReadingTime: number;
  completionRate: number;
  createdAt: string;
}

export interface TopVocabularyDTO {
  vocabularyListId: number;
  listName: string;
  learnerCount: number;
  averageWordsLearned: number;
  completionRate: number;
  totalWords: number;
  createdAt: string;
}

export interface TopEventDTO {
  eventId: number;
  eventName: string;
  participantCount: number;
  participationRate: number;
  startDate: string;
  endDate: string;
  createdAt: string;
}

export interface TopSlideDTO {
  slideId: number;
  slideName: string;
  isActive: boolean;
  createdAt: string;
}

export interface TopExamDTO {
  examId: number;
  examName: string;
  examType: string;
  attemptCount: number;
  completedCount: number;
  averageScore: number;
  completionRate: number;
  createdAt: string;
}

export interface ExamCompletionRateDTO {
  examId: number;
  examName: string;
  examType: string;
  totalAttempts: number;
  completedAttempts: number;
  completionRate: number;
  averageCompletionTime: number;
}

export interface ArticleCompletionRateDTO {
  articleId: number;
  title: string;
  totalReaders: number;
  completedReaders: number;
  completionRate: number;
  averageReadingTime: number;
}

export interface VocabularyCompletionRateDTO {
  vocabularyListId: number;
  listName: string;
  totalLearners: number;
  completedLearners: number;
  completionRate: number;
  averageWordsLearned: number;
  totalWords: number;
}

export interface EventParticipationRateDTO {
  eventId: number;
  eventName: string;
  totalUsers: number;
  participants: number;
  participationRate: number;
  startDate: string;
  endDate: string;
}

export interface ManagerAnalyticsOverviewDTO {
  activeUsers: ActiveUsersDTO;
  topArticles: TopArticleDTO[];
  topVocabulary: TopVocabularyDTO[];
  topEvents: TopEventDTO[];
  topSlides: TopSlideDTO[];
  topExams: TopExamDTO[];
  examCompletionRates: ExamCompletionRateDTO[];
  articleCompletionRates: ArticleCompletionRateDTO[];
  vocabularyCompletionRates: VocabularyCompletionRateDTO[];
  eventParticipationRates: EventParticipationRateDTO[];
}

export interface ApiResponse<T> {
  success: boolean;
  data: T;
  message?: string;
}

