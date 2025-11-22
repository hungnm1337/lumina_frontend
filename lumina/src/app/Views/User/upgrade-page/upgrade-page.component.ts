import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';
import { UpgradeModalComponent } from '../upgrade-modal/upgrade-modal.component';

@Component({
  selector: 'app-upgrade-page',
  standalone: true,
  imports: [CommonModule, UpgradeModalComponent],
  template: `
    <div class="min-h-screen bg-gradient-to-br from-blue-50 to-purple-50 flex items-center justify-center p-4">
      <app-upgrade-modal
        [isVisible]="true"
        (close)="onClose()"
      ></app-upgrade-modal>
    </div>
  `,
})
export class UpgradePageComponent {
  constructor(private router: Router) {}

  onClose(): void {
    // Navigate back to exams when modal is closed
    this.router.navigate(['/homepage/user-dashboard/exams']);
  }
}
