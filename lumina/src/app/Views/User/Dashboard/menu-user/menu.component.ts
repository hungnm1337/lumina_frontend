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
  movetoExams() {
    this.router.navigate(['homepage/user-dashboard/exams']);
  }

  moveToExamAttempts() {
    this.router.navigate(['homepage/user-dashboard/exam-attempts']);
  }

}
