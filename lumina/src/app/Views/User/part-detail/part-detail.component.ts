import { Component, Input, OnChanges, SimpleChanges } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ExamPartDTO } from '../../../Interfaces/exam.interfaces';

@Component({
  selector: 'app-part-detail',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './part-detail.component.html'
})
export class PartDetailComponent implements OnChanges {
  @Input() partInfo: ExamPartDTO | null = null;

  ngOnChanges(changes: SimpleChanges): void {
    if (changes['partInfo'] && this.partInfo) {
      this.savePartCodeToLocalStorage();
    }
  }

  private savePartCodeToLocalStorage(): void {
    try {
      if (!this.partInfo || !this.partInfo.partId) {
        return;
      }

      const partId = this.partInfo.partId;
      const partCode = this.partInfo.partCode;

      // Lưu trực tiếp với key là PartCodeStorage
      localStorage.setItem("PartCodeStorage", partCode[partCode.length - 1]);

    } catch (error) {
      // Silent error handling
    }
  }

}
