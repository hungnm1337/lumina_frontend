import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { forkJoin } from 'rxjs';
import { catchError, map } from 'rxjs/operators';
import { of } from 'rxjs';
import { ExamService } from '../../../Services/Exam/exam.service';
import { QuotaService } from '../../../Services/Quota/quota.service';
import { ExamDTO } from '../../../Interfaces/exam.interfaces';
import { QuotaRemainingDto } from '../../../Interfaces/quota.interfaces';

interface SkillGroup {
  skillName: string;
  skillCode: string;
  exams: ExamDTO[];
  icon: string;
  color: string;
}

interface PaginationState {
  [skillCode: string]: number; // Current page for each skill
}

@Component({
  selector: 'app-exams',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './exams.component.html',
  styleUrls: ['./exams.component.scss'],
})
export class ExamsComponent {
  exams: ExamDTO[] = [];
  skillGroups: SkillGroup[] = [];
  filteredSkillGroups: SkillGroup[] = [];
  isLoading = true;
  quotaInfo: QuotaRemainingDto | null = null;

  // Filter properties
  searchTerm: string = '';
  selectedSkill: string = '';
  sortBy: string = 'name';

  // Pagination properties
  readonly ITEMS_PER_PAGE = 3;
  currentPages: PaginationState = {};

  constructor(
    private examService: ExamService,
    private quotaService: QuotaService,
    private router: Router
  ) {
    this.loadExams();
    this.loadQuotaInfo();
  }

  private loadExams(): void {
    this.isLoading = true;

    // Check if user is logged in
    const token = localStorage.getItem('lumina_token');
    const isAuthenticated = !!token;

    if (isAuthenticated) {
      // Load exams with completion status for authenticated users
      forkJoin({
        exams: this.examService.GetAllExams(),
        completionStatuses: this.examService
          .getUserExamCompletionStatuses()
          .pipe(
            catchError((error) => {
              console.warn('⚠️ Could not load completion statuses:', error);
              return of([]); // Return empty array if error
            })
          ),
      }).subscribe({
        next: ({ exams, completionStatuses }) => {
          // Merge completion status into exams
          this.exams = exams.map((exam) => ({
            ...exam,
            completionStatus: completionStatuses.find(
              (s) => s.examId === exam.examId
            ),
          }));

          console.log('✅ Exams loaded with completion status:', this.exams);
          this.categorizeExamsBySkill();
          this.applyFilters();
          this.isLoading = false;
        },
        error: (error) => {
          console.error('❌ Error loading exams:', error);
          this.isLoading = false;
        },
      });
    } else {
      // Load exams without completion status for guests
      this.examService.GetAllExams().subscribe({
        next: (data) => {
          this.exams = data;
          console.log('✅ Exams loaded (guest mode):', this.exams);
          this.categorizeExamsBySkill();
          this.applyFilters();
          this.isLoading = false;
        },
        error: (error) => {
          console.error('❌ Error loading exams:', error);
          this.isLoading = false;
        },
      });
    }
  }

  private categorizeExamsBySkill(): void {
    // Define the 4 TOEIC skills with multiple possible examType values
    const skills = [
      {
        skillName: 'Listening',
        skillCodes: ['LISTENING', 'TOEIC_LISTENING', 'TOEIC_LISTENING_TEST'],
        icon: 'fas fa-headphones',
        color: 'blue',
      },
      {
        skillName: 'Reading',
        skillCodes: ['READING', 'TOEIC_READING', 'TOEIC_READING_TEST'],
        icon: 'fas fa-book-open',
        color: 'green',
      },
      {
        skillName: 'Speaking',
        skillCodes: ['SPEAKING', 'TOEIC_SPEAKING', 'TOEIC_SPEAKING_TEST'],
        icon: 'fas fa-microphone',
        color: 'purple',
      },
      {
        skillName: 'Writing',
        // ✅ Thêm nhiều biến thể cho Writing
        skillCodes: [
          'WRITTING',
          'WRITING',
          'TOEIC_WRITTING',
          'TOEIC_WRITING',
          'TOEIC_WRITING_TEST',
          'TOEIC_WRITTING_TEST',
        ],
        icon: 'fas fa-pen',
        color: 'orange',
      },
    ];

    this.skillGroups = skills.map((skill) => {
      const filteredExams = this.exams.filter((exam) =>
        skill.skillCodes.some((code) =>
          exam.examType?.toUpperCase().includes(code.toUpperCase())
        )
      );

      console.log(`✅ ${skill.skillName} - Matching codes:`, skill.skillCodes);
      console.log(
        `✅ ${skill.skillName} - Filtered exams:`,
        filteredExams.length,
        filteredExams
      );

      return {
        skillName: skill.skillName,
        skillCode: skill.skillCodes[0],
        icon: skill.icon,
        color: skill.color,
        exams: filteredExams,
      };
    });

    console.log(
      '✅ Skill groups after categorization:',
      this.skillGroups.map((g) => ({
        skill: g.skillName,
        count: g.exams.length,
        examIds: g.exams.map((e) => e.examId),
      }))
    );

    // Add "Other" category for unmatched exams
    const matchedExamIds = new Set();
    this.skillGroups.forEach((group) => {
      group.exams.forEach((exam) => matchedExamIds.add(exam.examId));
    });

    const unmatchedExams = this.exams.filter(
      (exam) => !matchedExamIds.has(exam.examId)
    );

    if (unmatchedExams.length > 0) {
      this.skillGroups.push({
        skillName: 'Other',
        skillCode: 'OTHER',
        icon: 'fas fa-question-circle',
        color: 'gray',
        exams: unmatchedExams,
      });
    }

    // Debug: Log exam types to console
    console.log(
      'All exam types found:',
      this.exams.map((exam) => exam.examType)
    );
    console.log('Skill groups:', this.skillGroups);
  }

  private loadQuotaInfo(): void {
    const token = localStorage.getItem('lumina_token');
    if (!token) {
      // Guest user, skip loading quota
      return;
    }

    this.quotaService.getRemainingQuota().subscribe({
      next: (data) => {
        this.quotaInfo = data;
        console.log('✅ Quota info loaded:', data);
      },
      error: (err) => {
        console.warn('⚠️ Failed to load quota:', err);
        // Don't block the UI if quota fails to load
      },
    });
  }

  getRemainingAttempts(skillName: string): number | null {
    if (!this.quotaInfo) return null;

    if (this.quotaInfo.isPremium) return -1; // Unlimited

    const skill = skillName.toLowerCase();
    if (skill === 'listening') {
      return this.quotaInfo.listeningRemaining;
    } else if (skill === 'reading') {
      return this.quotaInfo.readingRemaining;
    }

    return null; // Speaking/Writing don't show quota badge
  }

  getRemainingText(skillName: string): string {
    const remaining = this.getRemainingAttempts(skillName);

    if (remaining === null) return '';
    if (remaining === -1) return 'Unlimited';

    return `${remaining}/20 lượt`;
  }

  formatDate(date: Date): string {
    return new Date(date).toLocaleDateString('vi-VN', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
    });
  }

  getSkillGradient(color: string): string {
    switch (color) {
      case 'blue':
        return 'from-blue-500 to-blue-700';
      case 'green':
        return 'from-green-500 to-green-700';
      case 'purple':
        return 'from-purple-500 to-purple-700';
      case 'orange':
        return 'from-orange-500 to-orange-700';
      case 'gray':
        return 'from-gray-500 to-gray-700';
      default:
        return 'from-gray-500 to-gray-700';
    }
  }

  getButtonColor(color: string): string {
    switch (color) {
      case 'blue':
        return 'bg-blue-500 hover:bg-blue-600';
      case 'green':
        return 'bg-green-500 hover:bg-green-600';
      case 'purple':
        return 'bg-purple-500 hover:bg-purple-600';
      case 'orange':
        return 'bg-orange-500 hover:bg-orange-600';
      case 'gray':
        return 'bg-gray-500 hover:bg-gray-600';
      default:
        return 'bg-gray-500 hover:bg-gray-600';
    }
  }

  startExam(exam: ExamDTO): void {
    console.log('Selected exam ID:', exam.examId);
    console.log('Selected exam:', exam);

    // Navigate to exam detail page
    this.router.navigate(['homepage/user-dashboard/exam', exam.examId]);
  }

  applyFilters(): void {
    let filtered = [...this.skillGroups];

    // Filter by skill
    if (this.selectedSkill) {
      filtered = filtered.filter(
        (group) =>
          group.skillCode === this.selectedSkill ||
          group.skillName.toUpperCase() === this.selectedSkill
      );
    }

    // Filter by search term
    if (this.searchTerm.trim()) {
      const searchLower = this.searchTerm.toLowerCase();
      filtered = filtered
        .map((group) => ({
          ...group,
          exams: group.exams.filter(
            (exam) =>
              exam.name?.toLowerCase().includes(searchLower) ||
              exam.description?.toLowerCase().includes(searchLower) ||
              exam.createdByName?.toLowerCase().includes(searchLower)
          ),
        }))
        .filter((group) => group.exams.length > 0);
    }

    // Sort exams within each group
    filtered = filtered.map((group) => ({
      ...group,
      exams: this.sortExams([...group.exams]),
    }));

    this.filteredSkillGroups = filtered;

    // Reset pagination to page 1 when filters change
    this.resetPagination();
  }

  // Pagination methods
  getPaginatedExams(skillGroup: SkillGroup): ExamDTO[] {
    const currentPage = this.currentPages[skillGroup.skillCode] || 1;
    const startIndex = (currentPage - 1) * this.ITEMS_PER_PAGE;
    const endIndex = startIndex + this.ITEMS_PER_PAGE;
    return skillGroup.exams.slice(startIndex, endIndex);
  }

  getTotalPages(skillGroup: SkillGroup): number {
    return Math.ceil(skillGroup.exams.length / this.ITEMS_PER_PAGE);
  }

  getCurrentPage(skillCode: string): number {
    return this.currentPages[skillCode] || 1;
  }

  changePage(skillCode: string, page: number): void {
    this.currentPages[skillCode] = page;
  }

  getPageNumbers(skillGroup: SkillGroup): number[] {
    const totalPages = this.getTotalPages(skillGroup);
    return Array.from({ length: totalPages }, (_, i) => i + 1);
  }

  hasPagination(skillGroup: SkillGroup): boolean {
    return skillGroup.exams.length > this.ITEMS_PER_PAGE;
  }

  private resetPagination(): void {
    this.currentPages = {};
  }

  private sortExams(exams: ExamDTO[]): ExamDTO[] {
    switch (this.sortBy) {
      case 'name':
        return exams.sort((a, b) => (a.name || '').localeCompare(b.name || ''));
      case 'date':
        return exams.sort(
          (a, b) =>
            new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
        );
      case 'creator':
        return exams.sort((a, b) =>
          (a.createdByName || '').localeCompare(b.createdByName || '')
        );
      default:
        return exams;
    }
  }

  clearSearch(): void {
    this.searchTerm = '';
    this.applyFilters();
  }

  clearSkillFilter(): void {
    this.selectedSkill = '';
    this.applyFilters();
  }

  clearAllFilters(): void {
    this.searchTerm = '';
    this.selectedSkill = '';
    this.sortBy = 'name';
    this.applyFilters();
  }

  getTotalExamsCount(): number {
    return this.filteredSkillGroups.reduce(
      (total, group) => total + group.exams.length,
      0
    );
  }
}
