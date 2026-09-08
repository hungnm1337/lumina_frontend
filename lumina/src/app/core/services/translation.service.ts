import { HttpClient } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';
import { BehaviorSubject, Observable } from 'rxjs';
import { tap } from 'rxjs/operators';

/**
 * TranslationService: Quản lý ngôn ngữ và ánh xạ key-value đa ngôn ngữ.
 * Tải từ điển từ assets/i18n/{lang}.json, xóa bỏ hardcode text theo Báo cáo Đề xuất.
 */
@Injectable({
  providedIn: 'root'
})
export class TranslationService {
  private http = inject(HttpClient);
  private currentLangSubject = new BehaviorSubject<string>('vi');
  public currentLang$ = this.currentLangSubject.asObservable();

  private translations: Record<string, any> = {};
  private isLoadedSubject = new BehaviorSubject<boolean>(false);
  public isLoaded$ = this.isLoadedSubject.asObservable();

  constructor() {
    this.loadTranslations(this.currentLangSubject.value).subscribe();
  }

  get currentLang(): string {
    return this.currentLangSubject.value;
  }

  setLanguage(lang: 'vi' | 'en'): Observable<any> {
    this.currentLangSubject.next(lang);
    return this.loadTranslations(lang);
  }

  loadTranslations(lang: string): Observable<any> {
    return this.http.get<Record<string, any>>(`assets/i18n/${lang}.json`).pipe(
      tap({
        next: (data) => {
          this.translations = data;
          this.isLoadedSubject.next(true);
        },
        error: (err) => {
          console.warn(`[TranslationService] Không thể tải assets/i18n/${lang}.json:`, err);
          this.isLoadedSubject.next(true);
        }
      })
    );
  }

  /**
   * Lấy giá trị chuỗi theo path, ví dụ: instant('landing.hero.startNow')
   */
  instant(key: string, defaultValue = ''): string {
    if (!key) return defaultValue;

    const parts = key.split('.');
    let current = this.translations;

    for (const part of parts) {
      if (current && typeof current === 'object' && part in current) {
        current = current[part];
      } else {
        return defaultValue || key;
      }
    }

    return typeof current === 'string' ? current : defaultValue || key;
  }
}
