export interface StaffStats {
  totalArticles: number;
  totalQuestions: number;
  totalTests: number;
  totalVocabulary: number;
  articlesThisMonth: number;
  questionsThisMonth: number;
  testsThisMonth: number;
  vocabularyThisMonth: number;
  articlesLastMonth: number;
  questionsLastMonth: number;
  testsLastMonth: number;
  vocabularyLastMonth: number;
}

export interface RecentActivity {
  id: number;
  type: 'article' | 'test' | 'vocabulary' | string; 
  title: string;
  action: string;
  timestamp: string;
  status: 'published' | 'draft' | 'pending' | string; 
}

export interface StaffMetrics {
  productivityGrowth: number;
  contentLikes: number;
  qualityRating: number;
}

export interface StaffDashboardResponse {
  stats: StaffStats;
  recentActivities: RecentActivity[];
  metrics: StaffMetrics;
}