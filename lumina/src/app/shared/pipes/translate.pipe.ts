import { inject, Pipe, PipeTransform } from '@angular/core';
import { TranslationService } from '../../core/services/translation.service';

/**
 * TranslatePipe: Pipe ánh xạ chuỗi đa ngôn ngữ trong Angular template.
 * Cú pháp: {{ 'landing.hero.startNow' | translate }}
 */
@Pipe({
  name: 'translate',
  standalone: true,
  pure: false // Để tự động cập nhật khi đổi ngôn ngữ
})
export class TranslatePipe implements PipeTransform {
  private translationService = inject(TranslationService);

  transform(key: string, defaultValue = ''): string {
    return this.translationService.instant(key, defaultValue);
  }
}
