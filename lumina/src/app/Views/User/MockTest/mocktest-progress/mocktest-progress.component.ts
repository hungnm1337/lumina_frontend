import { Component, Input } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MockTestPart } from '../../../../Interfaces/mocktest.interface';

@Component({
  selector: 'app-mocktest-progress',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './mocktest-progress.component.html',
  styleUrls: ['./mocktest-progress.component.scss']
})
export class MocktestProgressComponent {
  @Input() parts: MockTestPart[] = [];
  @Input() currentPartIndex: number = 0;

  getPartStatus(index: number): 'completed' | 'current' | 'upcoming' {
    if (this.parts[index].isCompleted) return 'completed';
    if (index === this.currentPartIndex) return 'current';
    return 'upcoming';
  }

  getProgressPercentage(): number {
    const completedParts = this.parts.filter(p => p.isCompleted).length;
    return (completedParts / this.parts.length) * 100;
  }
}
