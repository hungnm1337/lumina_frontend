import { Component, OnInit } from '@angular/core';
import { ExamService } from '../../../Services/Exam/exam.service';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { PopupComponent } from '../../Common/popup/popup.component';

@Component({
  selector: 'app-exams',
  standalone: true,
  imports: [CommonModule, FormsModule, PopupComponent],
  templateUrl: './exams.component.html',
  styleUrls: ['./exams.component.scss']
})
export class ExamsComponent implements OnInit {
  allExamGroups: any[] = []; // Array to store all original groups
  examGroups: any[] = [];    // Array to display on UI (will be changed by filter)
  
  showMonths = 3;
  message = '';
  messageType: 'success' | 'error' = 'success';

  // Filter properties
  searchName: string = '';
  selectedSetKey: string = '';
  examSetKeys: string[] = [];

  // Popup confirmation
  showConfirmPopup = false;
  confirmPopupTitle = '';
  confirmPopupMessage = '';
  pendingExam: any = null;

  constructor(private examService: ExamService) { }

  ngOnInit(): void {
    this.loadExamsGroupedByMonth();
  }

  loadExamsGroupedByMonth() {
    this.examService.getAllExamsWithParts().subscribe({
      next: (data) => {
        // Store original and display data
        this.allExamGroups = data;
        this.examGroups = data;

        // Create unique keys list (month-year) for dropdown filter
        // Use Set to ensure no duplicate values
        this.examSetKeys = [...new Set(data.map((group: any) => group.examSetKey))];
        
        // Update initial display list, may not be needed if no complex pagination
        this.updateVisibleGroups(); 
      },
      error: (err) => {
        console.error('Error loading exams:', err);
      }
    });
  }

  updateVisibleGroups() {
    // This function will now be handled by filterExams and slice logic in HTML
    // We can call filterExams() here to apply default filters if any
    this.filterExams();
  }

  onLoadMore() {
    this.showMonths += 3;
  }

  openExamModal(exam?: any) {
    console.log('Open exam modal:', exam);
  }

  toggleExamStatus(exam: any) {
    this.pendingExam = exam;
    this.confirmPopupTitle = exam.isActive ? '🔒 Lock Exam' : '🔓 Unlock Exam';
    this.confirmPopupMessage = exam.isActive
      ? `Are you sure you want to lock "${exam.name}"?\n\nOnce locked, students will not be able to access this exam.`
      : `Are you sure you want to unlock "${exam.name}"?\n\nOnce unlocked, students will be able to access this exam.`;
    this.showConfirmPopup = true;
  }

  onConfirmToggleStatus() {
    if (!this.pendingExam) return;

    const exam = this.pendingExam;
    this.examService.toggleExamStatus(exam.examId).subscribe({
      next: (res: any) => {
        exam.isActive = !exam.isActive;
        this.showMessage(res?.message || (exam.isActive ? 'Exam unlocked successfully!' : 'Exam locked successfully!'), 'success');
      },
      error: (err) => {
        let msg = 'Error changing exam status';
        if (err?.error?.message) msg = err.error.message;
        this.showMessage(msg, 'error');
        console.error('Error changing exam status:', err);
      }
    });

    this.showConfirmPopup = false;
    this.pendingExam = null;
  }

  onCancelToggleStatus() {
    this.showConfirmPopup = false;
    this.pendingExam = null;
  }

  // --- Create Exam Logic ---
  showCreateExamModal = false;
  createMonth = (new Date().getMonth() + 1);
  createYear = new Date().getFullYear();
  validYears = [2025, 2026, 2027, 2028, 2029, 2030];
  
  onCreateExam() {
    const mm = this.createMonth < 10 ? '0' + this.createMonth : this.createMonth;
    const toSetKey = `${mm}-${this.createYear}`;
    this.createExamForMonth(toSetKey);
    this.showCreateExamModal = false;
  }

  // ✅ Removed fromSetKey parameter
  createExamForMonth(toSetKey: string) {
    this.examService.createExamForMonth(toSetKey).subscribe({
      next: (res: any) => {
        this.showMessage(
          res?.message || 'Exams created successfully!',
          'success'
        );
        this.loadExamsGroupedByMonth(); // Reload list
      },
      error: (err) => {
        let msg = 'Error creating exams';
        if (err?.error?.message) msg = err.error.message;
        this.showMessage(msg, 'error');
      }
    });
  }

  // --- Updated Filter Logic ---
  filterExams() {
    // Start with full list
    let filteredData = [...this.allExamGroups];

    // 1. Filter by month/year (selectedSetKey)
    if (this.selectedSetKey) {
      filteredData = filteredData.filter(group => group.examSetKey === this.selectedSetKey);
    }

    // 2. Filter by exam name (searchName)
    if (this.searchName) {
      const searchTerm = this.searchName.toLowerCase();
      // Filter groups containing at least one exam matching search term
      filteredData = filteredData.filter(group => 
        group.exams.some((exam: any) => 
          exam.name.toLowerCase().includes(searchTerm)
        )
      );
    }

    // Update display list
    this.examGroups = filteredData;
  }

  showMessage(msg: string, type: 'success' | 'error' = 'success') {
    this.message = msg;
    this.messageType = type;
    setTimeout(() => this.message = '', 3000);
  }
}