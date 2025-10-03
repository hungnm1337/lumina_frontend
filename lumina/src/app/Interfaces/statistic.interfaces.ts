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
  type: 'article' | 'test' | 'vocabulary' | string; // Thêm string để linh hoạt
  title: string;
  action: string;
  timestamp: string;
  status: 'published' | 'created' | 'updated' | 'reviewed' | string; // Thêm string để linh hoạt
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