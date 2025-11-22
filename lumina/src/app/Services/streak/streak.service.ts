import { Injectable } from '@angular/core';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';

@Injectable({
  providedIn: 'root'
})
export class StreakService {
  private baseUrl = `${environment.apiUrl}/Streak`;

  constructor(private http: HttpClient) {}

  
  private getAuthHeaders(): HttpHeaders {
    const token = localStorage.getItem('lumina_token');
    return new HttpHeaders({
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json'
    });
  }

  // ============================
  // 📊 API ENDPOINTS
  // ============================

  getStreakSummary(userId: number): Observable<any> {
    return this.http.get<any>(
      `${this.baseUrl}/summary/${userId}`,
      { headers: this.getAuthHeaders() }
    );
  }

  updateStreak(userId: number): Observable<any> {
    const body = { userId };
    return this.http.post<any>(
      `${this.baseUrl}/update`,
      body,
      { headers: this.getAuthHeaders() }
    );
  }

  triggerDailyJob(): Observable<any> {
    return this.http.post<any>(
      `${this.baseUrl}/admin/trigger-daily-job`,
      {},
      { headers: this.getAuthHeaders() }
    );
  }

  triggerReminderJob(): Observable<any> {
    return this.http.post<any>(
      `${this.baseUrl}/admin/trigger-reminder-job`,
      {},
      { headers: this.getAuthHeaders() }
    );
  }

  testAutoProcess(userId: number): Observable<any> {
    return this.http.post<any>(
      `${this.baseUrl}/admin/test-auto-process/${userId}`,
      {},
      { headers: this.getAuthHeaders() }
    );
  }

  getUsersNeedingProcess(): Observable<any> {
    return this.http.get<any>(
      `${this.baseUrl}/admin/users-needing-process`,
      { headers: this.getAuthHeaders() }
    );
  }

  getUsersNeedingReminder(): Observable<any> {
    return this.http.get<any>(
      `${this.baseUrl}/admin/users-needing-reminder`,
      { headers: this.getAuthHeaders() }
    );
  }

  getTopStreakUsers(): Observable<any> {
    return this.http.get<any>(
      `${this.baseUrl}/top`,
      { headers: this.getAuthHeaders() }
    );
  }

  // ============================
  // 🎨 UTILITY METHODS
  // ============================

  /**
   * Format số ngày streak thành text hiển thị
   */
  getStreakText(streak: number): string {
    if (streak === 0) return 'Bắt đầu streak ngay hôm nay!';
    if (streak === 1) return '1 ngày 🌟';
    if (streak < 7) return `${streak} ngày liên tiếp 🔥`;
    if (streak < 30) return `${streak} ngày liên tiếp 🔥🔥`;
    return `${streak} ngày liên tiếp 🔥🔥🔥`;
  }

  /**
   * Lấy emoji dựa vào streak level
   */
  getStreakEmoji(streak: number): string {
    if (streak === 0) return '🌱';
    if (streak < 7) return '🔥';
    if (streak < 30) return '🔥🔥';
    return '🔥🔥🔥';
  }

  /**
   * Tính % tiến độ đến milestone tiếp theo
   */
  getProgressToNextMilestone(currentStreak: number, nextMilestone: number): number {
    if (nextMilestone === 0) return 0;
    return Math.round((currentStreak / nextMilestone) * 100 * 100) / 100;
  }

  /**
   * Kiểm tra xem có phải milestone không
   */
  isMilestone(streak: number): boolean {
    const milestones = [7, 14, 30, 60, 90, 180, 365];
    return milestones.includes(streak);
  }

  /**
   * Lấy milestone tiếp theo
   */
  getNextMilestone(currentStreak: number): number {
    const milestones = [7, 14, 30, 60, 90, 180, 365];
    return milestones.find(m => m > currentStreak) || 365;
  }

  /**
   * Lấy màu sắc cho streak badge
   */
  getStreakColor(streak: number): string {
    if (streak === 0) return '#9E9E9E'; // Gray
    if (streak < 7) return '#FF6B35';   // Orange
    if (streak < 30) return '#FF4500';  // Red-Orange
    return '#DC143C';                    // Crimson Red
  }

  /**
   * Format ngày tháng từ ISO string
   */
  formatDate(isoDate: string | null): string {
    if (!isoDate) return 'Chưa có';
    const date = new Date(isoDate);
    return date.toLocaleDateString('vi-VN');
  }

  /**
   * Tính số ngày từ lastPracticeDate đến hôm nay
   */
  getDaysSinceLastPractice(lastPracticeDate: string | null): number {
    if (!lastPracticeDate) return 999;
    const last = new Date(lastPracticeDate);
    const today = new Date();
    const diffTime = today.getTime() - last.getTime();
    return Math.floor(diffTime / (1000 * 60 * 60 * 24));
  }
}
