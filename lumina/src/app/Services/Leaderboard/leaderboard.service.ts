import { Injectable } from '@angular/core';

import { HttpClient, HttpHeaders, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';

// DTOs matching backend
export interface LeaderboardDTO {
  leaderboardId: number;
  seasonName: string | null;
  seasonNumber: number;
  startDate: string | null;
  endDate: string | null;
  isActive: boolean;
  createAt: string | null;
  updateAt: string | null;
  totalParticipants: number;
  status: 'Upcoming' | 'Active' | 'Ended';
  daysRemaining: number;
}

export interface CreateLeaderboardDTO {
  seasonName: string | null;
  seasonNumber: number;
  startDate: string | null;
  endDate: string | null;
  isActive: boolean;
}

export interface UpdateLeaderboardDTO {
  seasonName: string | null;
  seasonNumber: number;
  startDate: string | null;
  endDate: string | null;
  isActive: boolean;
}

export interface LeaderboardRankDTO {
  userId: number;
  fullName: string;
  score: number;
  rank: number;
  estimatedTOEICScore: number | null;
  toeicLevel: string;
  avatarUrl: string | null;
}

// Notification DTO
export interface NotificationDTO {
  notificationId: number;
  userId: number;
  title: string;
  message: string;
  type: 'Khuyến khích' | 'Thành tích' | 'Cảnh báo';
  isRead: boolean;
  createAt: string;
}

export interface UserSeasonStatsDTO {
  userId: number;
  currentRank: number;
  currentScore: number;
  estimatedTOEICScore: number;
  toeicLevel: string;
  totalAttempts: number;
  correctAnswers: number;
  accuracyRate: number;
  isReadyForTOEIC: boolean;
}

export interface TOEICScoreCalculationDTO {
  userId: number;
  estimatedTOEICScore: number;
  toeicLevel: string;
  basePointsPerCorrect: number;
  timeBonus: number;
  accuracyBonus: number;
  difficultyMultiplier: number;
  totalSeasonScore: number;
}

// Calculate Score DTOs
export interface CalculateScoreRequestDTO {
  examAttemptId: number;
  examPartId: number; // 1=Listening, 2=Reading
  correctAnswers: number;
  totalQuestions: number;
  timeSpentSeconds: number;
  expectedTimeSeconds: number;
}

export interface CalculateScoreResponseDTO {
  seasonScore: number; // Điểm được cộng lần này
  estimatedTOEIC: number; // Điểm TOEIC ước tính (0-990)
  toeicLevel: string; // Beginner/Elementary/Intermediate/Upper-Intermediate/Advanced/Proficient
  basePoints: number;
  timeBonus: number;
  accuracyBonus: number;
  isFirstAttempt: boolean; // True nếu là lần đầu làm đề này
  toeicMessage?: string; // Thông báo động viên
  totalAccumulatedScore: number; // Tổng điểm tích lũy hiện tại
}

export interface PaginatedResultDTO<T> {
  items: T[];
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
  hasNext: boolean;
  hasPrevious: boolean;
}

@Injectable({
  providedIn: 'root'
})
export class LeaderboardService {
  private apiUrl = `${environment.apiUrl}/leaderboard`;
private getAuthHeaders(): HttpHeaders {
      const token = localStorage.getItem('lumina_token');
      return new HttpHeaders({
        Authorization: token ? `Bearer ${token}` : '',
        accept: 'application/json',
        'Content-Type': 'application/json',
      });
    }
  constructor(private http: HttpClient) { }

  // ==================== SEASON MANAGEMENT ====================

  getAllPaginated(keyword?: string, page: number = 1, pageSize: number = 10): Observable<PaginatedResultDTO<LeaderboardDTO>> {
    let params = new HttpParams()
      .set('page', page.toString())
      .set('pageSize', pageSize.toString());

    if (keyword) {
      params = params.set('keyword', keyword);
    }

    return this.http.get<PaginatedResultDTO<LeaderboardDTO>>(this.apiUrl, { params });
  }

  getAllSimple(isActive?: boolean): Observable<LeaderboardDTO[]> {
    let params = new HttpParams();
    if (isActive !== undefined) {
      params = params.set('isActive', isActive.toString());
    }
    return this.http.get<LeaderboardDTO[]>(`${this.apiUrl}/all`, { params });
  }

  getCurrentSeason(): Observable<LeaderboardDTO> {
    return this.http.get<LeaderboardDTO>(`${this.apiUrl}/current`);
  }

  getById(leaderboardId: number): Observable<LeaderboardDTO> {
    return this.http.get<LeaderboardDTO>(`${this.apiUrl}/${leaderboardId}`);
  }

  create(dto: CreateLeaderboardDTO): Observable<number> {
    return this.http.post<number>(this.apiUrl, dto, { headers: this.getAuthHeaders() });
  }

  update(leaderboardId: number, dto: UpdateLeaderboardDTO): Observable<void> {
    return this.http.put<void>(`${this.apiUrl}/${leaderboardId}`, dto, { headers: this.getAuthHeaders() });
  }

  delete(leaderboardId: number): Observable<void> {
    return this.http.delete<void>(`${this.apiUrl}/${leaderboardId}`, { headers: this.getAuthHeaders() });
  }

  setAsCurrent(leaderboardId: number): Observable<void> {
    return this.http.post<void>(`${this.apiUrl}/${leaderboardId}/set-current`, {}, { headers: this.getAuthHeaders() });
  }

  // ==================== RANKING ====================

  getRanking(leaderboardId: number, top: number = 100): Observable<LeaderboardRankDTO[]> {
    const params = new HttpParams().set('top', top.toString());
    return this.http.get<LeaderboardRankDTO[]>(`${this.apiUrl}/${leaderboardId}/ranking`, { params });
  }

  recalculate(leaderboardId: number): Observable<{ affected: number; message: string }> {
    return this.http.post<{ affected: number; message: string }>(`${this.apiUrl}/${leaderboardId}/recalculate`, {}, { headers: this.getAuthHeaders() });
  }

  reset(leaderboardId: number, archiveScores: boolean = true): Observable<{ affected: number; message: string }> {
    const params = new HttpParams().set('archiveScores', archiveScores.toString());
    return this.http.post<{ affected: number; message: string }>(`${this.apiUrl}/${leaderboardId}/reset`, {}, { params, headers: this.getAuthHeaders() });
  }

  // ==================== USER STATS ====================

  getMyStats(leaderboardId?: number): Observable<UserSeasonStatsDTO> {
    let params = new HttpParams();
    if (leaderboardId) {
      params = params.set('leaderboardId', leaderboardId.toString());
    }
    return this.http.get<UserSeasonStatsDTO>(`${this.apiUrl}/user/stats`, { params, headers: this.getAuthHeaders() });
  }

  getUserStats(userId: number, leaderboardId?: number): Observable<UserSeasonStatsDTO> {
    let params = new HttpParams();
    if (leaderboardId) {
      params = params.set('leaderboardId', leaderboardId.toString());
    }
    return this.http.get<UserSeasonStatsDTO>(`${this.apiUrl}/user/${userId}/stats`, { params, headers: this.getAuthHeaders() });
  }

  getMyTOEICCalculation(leaderboardId?: number): Observable<TOEICScoreCalculationDTO> {
    let params = new HttpParams();
    if (leaderboardId) {
      params = params.set('leaderboardId', leaderboardId.toString());
    }
    return this.http.get<TOEICScoreCalculationDTO>(`${this.apiUrl}/user/toeic-calculation`, { params, headers: this.getAuthHeaders() });
  }

  getMyRank(leaderboardId?: number): Observable<{ rank: number }> {
    let params = new HttpParams();
    if (leaderboardId) {
      params = params.set('leaderboardId', leaderboardId.toString());
    }
    return this.http.get<{ rank: number }>(`${this.apiUrl}/user/rank`, { params, headers: this.getAuthHeaders() });
  }

  // Calculate score after exam completion (Listening/Reading only)
  calculateScore(request: CalculateScoreRequestDTO): Observable<CalculateScoreResponseDTO> {
    return this.http.post<CalculateScoreResponseDTO>(
      `${this.apiUrl}/calculate-score`,
      request,
      { headers: this.getAuthHeaders() }
    );
  }

  // ==================== AUTO MANAGEMENT ====================

  autoManage(): Observable<{ message: string }> {
    return this.http.post<{ message: string }>(`${this.apiUrl}/auto-manage`, {}, { headers: this.getAuthHeaders() });
  }

  // ==================== HELPER METHODS ====================

  formatDate(date: string | null): string {
    if (!date) return 'N/A';
    return new Date(date).toLocaleDateString('vi-VN');
  }

  // Get TOEIC level text in Vietnamese
  getTOEICLevelText(level: string): string {
    switch (level) {
      case 'Beginner': return 'Bắt đầu hành trình'; // 0-200
      case 'Elementary': return 'Đang tiến bộ'; // 201-400
      case 'Intermediate': return 'Trung bình'; // 401-600
      case 'Upper-Intermediate': return 'Khá tốt'; // 601-750
      case 'Advanced': return 'Sẵn sàng thi'; // 751-850
      case 'Proficient': return 'Xuất sắc'; // 851-990
      default: return level;
    }
  }

  // Get TOEIC score range
  getTOEICScoreRange(level: string): string {
    switch (level) {
      case 'Beginner': return '0-200';
      case 'Elementary': return '201-400';
      case 'Intermediate': return '401-600';
      case 'Upper-Intermediate': return '601-750';
      case 'Advanced': return '751-850';
      case 'Proficient': return '851-990';
      default: return 'N/A';
    }
  }

  getTOEICLevelColor(level: string): string {
    switch (level) {
      case 'Beginner': return '#94a3b8'; // Slate - 15 điểm/câu
      case 'Elementary': return '#60a5fa'; // Blue - 12 điểm/câu
      case 'Intermediate': return '#34d399'; // Green - 8 điểm/câu
      case 'Upper-Intermediate': return '#fbbf24'; // Yellow - 5 điểm/câu
      case 'Advanced': return '#f97316'; // Orange - 3 điểm/câu
      case 'Proficient': return '#dc2626'; // Red - 2 điểm/câu
      default: return '#6b7280';
    }
  }

  getTOEICLevelIcon(level: string): string {
    switch (level) {
      case 'Beginner': return '🌱'; // 0-200: Mới bắt đầu
      case 'Elementary': return '📚'; // 201-400: Đang phát triển
      case 'Intermediate': return '📖'; // 401-600: Nền tảng vững
      case 'Upper-Intermediate': return '🎯'; // 601-750: Tiến bộ tốt
      case 'Advanced': return '🏆'; // 751-850: Gần hoàn thiện
      case 'Proficient': return '👑'; // 851-990: Trình độ cao
      default: return '📊';
    }
  }

  // Get base points per correct answer based on TOEIC level
  getBasePointsPerCorrect(level: string): number {
    switch (level) {
      case 'Beginner': return 15; // 0-200 TOEIC
      case 'Elementary': return 12; // 201-400 TOEIC
      case 'Intermediate': return 8; // 401-600 TOEIC
      case 'Upper-Intermediate': return 5; // 601-750 TOEIC
      case 'Advanced': return 3; // 751-850 TOEIC
      case 'Proficient': return 2; // 851-990 TOEIC
      default: return 10;
    }
  }

  // Get time bonus percentage based on TOEIC level
  getTimeBonusPercent(level: string): number {
    switch (level) {
      case 'Beginner': return 0.30; // 30%
      case 'Elementary': return 0.25; // 25%
      case 'Intermediate': return 0.20; // 20%
      case 'Upper-Intermediate': return 0.15; // 15%
      case 'Advanced': return 0.10; // 10%
      case 'Proficient': return 0.10; // 10%
      default: return 0.15;
    }
  }

  // Get accuracy bonus percentage based on TOEIC level
  getAccuracyBonusPercent(level: string): number {
    switch (level) {
      case 'Beginner': return 1.50; // 150%
      case 'Elementary': return 1.20; // 120%
      case 'Intermediate': return 0.80; // 80%
      case 'Upper-Intermediate': return 0.50; // 50%
      case 'Advanced': return 0.30; // 30%
      case 'Proficient': return 0.20; // 20%
      default: return 0.50;
    }
  }

  getStatusClass(status: string): string {
    switch (status) {
      case 'Active': return 'bg-green-100 text-green-800';
      case 'Upcoming': return 'bg-blue-100 text-blue-800';
      case 'Ended': return 'bg-gray-100 text-gray-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  }

  getStatusText(status: string): string {
    switch (status) {
      case 'Active': return 'Đang diễn ra';
      case 'Upcoming': return 'Sắp diễn ra';
      case 'Ended': return 'Đã kết thúc';
      default: return status;
    }
  }
}
