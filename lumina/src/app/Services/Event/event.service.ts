import { Injectable } from '@angular/core';
import { environment } from '../../../environments/environment';
import { Observable } from 'rxjs';
import { HttpClient, HttpHeaders } from '@angular/common/http';
export interface EventDTO {
  eventId: number;
  eventName: string;
  content?: string;
  startDate: Date;
  endDate: Date;
  createAt: Date;
  updateAt?: Date;
  createBy: number;
  updateBy?: number;
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
  providedIn: 'root',
})
export class EventService {
  private apiUrl = environment.apiUrl;
  constructor(private httpClient: HttpClient) {}

  private getAuthHeaders(): HttpHeaders {
    const token = localStorage.getItem('lumina_token');
    return new HttpHeaders({
      Authorization: token ? `Bearer ${token}` : '',
      accept: 'application/json',
      'Content-Type': 'application/json',
    });
  }


  public GetAllEventsPaginated(page: number = 1, pageSize: number = 10, from?: Date, to?: Date, keyword?: string): Observable<PaginatedResultDTO<EventDTO>> {
    let params = new URLSearchParams();
    params.set('page', page.toString());
    params.set('pageSize', pageSize.toString());
    
    if (from) {
      params.set('from', from.toISOString());
    }
    if (to) {
      params.set('to', to.toISOString());
    }
    if (keyword) {
      params.set('keyword', keyword);
    }

    return this.httpClient.get<PaginatedResultDTO<EventDTO>>(`${this.apiUrl}/Event?${params.toString()}`, {
      headers: this.getAuthHeaders(),
    });
  }

  public GetEventById(eventId: number): Observable<EventDTO> {
    return this.httpClient.get<EventDTO>(`${this.apiUrl}/Event/${eventId}`);
  }

  public CreateEvent(payload: EventDTO): Observable<EventDTO> {
    const body = this.cleanPayload(this.normalizePayload(payload));
    console.log('Creating event with payload:', body);
    console.log('API URL:', `${this.apiUrl}/Event`);
    console.log('Auth headers:', this.getAuthHeaders());
    return this.httpClient.post<EventDTO>(`${this.apiUrl}/Event`, body, {
      headers: this.getAuthHeaders(),
    });
  }

  public UpdateEvent(eventId: number, payload: EventDTO): Observable<EventDTO> {
    const body = this.cleanPayload(this.normalizePayload(payload));
    return this.httpClient.put<EventDTO>(`${this.apiUrl}/Event/${eventId}`, body, {
      headers: this.getAuthHeaders(),
    });
  }

  public DeleteEvent(eventId: number): Observable<void> {
    return this.httpClient.delete<void>(`${this.apiUrl}/Event/${eventId}`, {
      headers: this.getAuthHeaders(),
    });
  }

  private normalizePayload<T extends { startDate?: string | Date; endDate?: string | Date }>(payload: T): T {
    const toIso = (v?: string | Date) => {
      if (!v) return v as any;
      const d = typeof v === 'string' ? new Date(v) : v;
      // set to start of day to avoid timezone shifting server-side
      const normalized = new Date(Date.UTC(d.getFullYear(), d.getMonth(), d.getDate(), 0, 0, 0));
      return normalized.toISOString();
    };
    return {
      ...payload,
      startDate: toIso(payload.startDate),
      endDate: toIso(payload.endDate),
    } as T;
  }

  private cleanPayload<T extends Record<string, any>>(payload: T): T {
    const cleaned: Record<string, any> = {};
    Object.keys(payload || {}).forEach((k) => {
      const v = (payload as any)[k];
      if (v === undefined || v === null) return;
      if (typeof v === 'string' && v.trim() === '') return;
      cleaned[k] = v;
    });
    return cleaned as T;
  }
}

