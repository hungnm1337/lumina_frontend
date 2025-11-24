export interface QuotaCheckResponse {
  canAccess: boolean;
  isPremium: boolean;
  requiresUpgrade: boolean;
  remainingAttempts: number;
  subscriptionType: 'FREE' | 'PREMIUM';
  message: string;
}

export interface SubscriptionStatus {
  hasActiveSubscription: boolean;
  subscriptionType: 'FREE' | 'PREMIUM';
  startDate?: string;
  endDate?: string;
  packageId?: number;
}

export interface QuotaRemainingDto {
  isPremium: boolean;
  readingRemaining: number;
  listeningRemaining: number;
  readingUsed: number;
  listeningUsed: number;
  readingLimit: number;
  listeningLimit: number;
}
