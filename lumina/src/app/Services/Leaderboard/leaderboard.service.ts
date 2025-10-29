import { Injectable } from '@angular/core';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';

export interface LeaderboardDTO {
  leaderboardId: number;
  seasonName?: string | null;
  seasonNumber: number;
  startDate?: string | null;
  endDate?: string | null;
  isActive: boolean;
  createAt?: string | null;
  updateAt?: string | null;
}

export interface CreateLeaderboardDTO {
  seasonName?: string | null;
  seasonNumber: number;
  startDate?: string | null;
  endDate?: string | null;
  isActive: boolean;
}

export interface UpdateLeaderboardDTO extends CreateLeaderboardDTO {}

export interface PaginatedResultDTO<T> {
  items: T[];
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
  hasNext: boolean;
  hasPrevious: boolean;
}

export interface LeaderboardRankDTO {
  userId: number;
  fullName: string;
  score: number;
  rank: number;
}

@Injectable({ providedIn: 'root' })
export class LeaderboardService {
  private baseUrl = `${environment.apiUrl}/Leaderboard`;

  constructor(private http: HttpClient) {}

  private getAuthHeaders(): HttpHeaders {
    const token = localStorage.getItem('lumina_token');
    return new HttpHeaders({
      Authorization: token ? `Bearer ${token}` : ''
    });
  }

  getAllPaginated(keyword = '', page = 1, pageSize = 10): Observable<PaginatedResultDTO<LeaderboardDTO>> {
    const params: string[] = [];
    if (keyword) params.push(`keyword=${encodeURIComponent(keyword)}`);
    params.push(`page=${page}`);
    params.push(`pageSize=${pageSize}`);
    const query = params.length ? `?${params.join('&')}` : '';
    return this.http.get<PaginatedResultDTO<LeaderboardDTO>>(`${this.baseUrl}${query}`, { headers: this.getAuthHeaders() });
  }

  getAll(isActive?: boolean): Observable<LeaderboardDTO[]> {
    const query = typeof isActive === 'boolean' ? `?isActive=${isActive}` : '';
    return this.http.get<LeaderboardDTO[]>(`${this.baseUrl}/all${query}`, { headers: this.getAuthHeaders() });
  }

  getCurrent(): Observable<LeaderboardDTO> {
    return this.http.get<LeaderboardDTO>(`${this.baseUrl}/current`, { headers: this.getAuthHeaders() });
  }

  getById(id: number): Observable<LeaderboardDTO> {
    return this.http.get<LeaderboardDTO>(`${this.baseUrl}/${id}`, { headers: this.getAuthHeaders() });
  }

  create(body: CreateLeaderboardDTO): Observable<number> {
    return this.http.post<number>(`${this.baseUrl}`, body, { headers: this.getAuthHeaders() });
  }

  update(id: number, body: UpdateLeaderboardDTO): Observable<void> {
    return this.http.put<void>(`${this.baseUrl}/${id}`, body, { headers: this.getAuthHeaders() });
  }

  delete(id: number): Observable<void> {
    return this.http.delete<void>(`${this.baseUrl}/${id}`, { headers: this.getAuthHeaders() });
  }

  setCurrent(id: number): Observable<void> {
    return this.http.post<void>(`${this.baseUrl}/${id}/set-current`, {}, { headers: this.getAuthHeaders() });
  }

  getRanking(leaderboardId: number, top = 100): Observable<LeaderboardRankDTO[]> {
    return this.http.get<LeaderboardRankDTO[]>(`${this.baseUrl}/${leaderboardId}/ranking?top=${top}`, { headers: this.getAuthHeaders() });
  }

  recalculate(leaderboardId: number): Observable<number> {
    return this.http.post<number>(`${this.baseUrl}/${leaderboardId}/recalculate`, {}, { headers: this.getAuthHeaders() });
  }
}
