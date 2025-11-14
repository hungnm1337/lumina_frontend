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
      case 'Beginner': return 'Bắt đầu hành trình';
      case 'Elementary': return 'Đang tiến bộ';
      case 'Intermediate': return 'Trung bình';
      case 'Upper-Intermediate': return 'Khá tốt';
      case 'Advanced': return 'Sẵn sàng thi';
      case 'Proficient': return 'Xuất sắc';
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
      case 'Beginner': return '#94a3b8';
      case 'Elementary': return '#60a5fa';
      case 'Intermediate': return '#34d399';
      case 'Upper-Intermediate': return '#fbbf24';
      case 'Advanced': return '#f97316';
      case 'Proficient': return '#dc2626';
      default: return '#6b7280';
    }
  }

  getTOEICLevelIcon(level: string): string {
    switch (level) {
      case 'Beginner': return '🌱';
      case 'Elementary': return '📚';
      case 'Intermediate': return '📖';
      case 'Upper-Intermediate': return '🎯';
      case 'Advanced': return '🏆';
      case 'Proficient': return '👑';
      default: return '📊';
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
