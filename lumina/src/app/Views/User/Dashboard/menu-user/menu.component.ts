import { Component } from '@angular/core';
import { Router } from '@angular/router';
@Component({
  selector: 'app-menu',
  standalone: true,
  imports: [],
  templateUrl: './menu.component.html',
  styleUrls: ['./menu.component.scss']
})
export class MenuComponent {
  moveToReportList() {
    this.router.navigate(['homepage/user-dashboard/reports']);
  }
  moveToNoteList() {
    this.router.navigate(['homepage/user-dashboard/notes']);
  }

  constructor(private router: Router) { }

  isActive(section: 'exams' | 'attempts' | 'notes' | 'reports'): boolean {
    const url = this.router.url;

    switch (section) {
      case 'exams':
        return url.includes('/homepage/user-dashboard/exams') || /\/homepage\/user-dashboard\/exam\/\d+/.test(url);
      case 'attempts':
        return url.includes('/homepage/user-dashboard/exam-attempts');
      case 'notes':
        return url.includes('/homepage/user-dashboard/notes');
      case 'reports':
        return url.includes('/homepage/user-dashboard/reports');
      default:
        return false;
    }
  }

  movetoExams() {
    this.router.navigate(['homepage/user-dashboard/exams']);
  }

  moveToExamAttempts() {
    this.router.navigate(['homepage/user-dashboard/exam-attempts']);
  }

}
