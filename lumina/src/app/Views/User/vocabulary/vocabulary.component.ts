import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule, ReactiveFormsModule, FormBuilder, FormGroup, Validators } from '@angular/forms';
import { HeaderComponent } from '../../Common/header/header.component';
import { ActivatedRoute, Router } from '@angular/router';
import { VocabularyService } from '../../../Services/Vocabulary/vocabulary.service';
import { VocabularyListResponse, VocabularyListCreate } from '../../../Interfaces/vocabulary.interfaces';
import { VocabularyListDetailComponent } from '../vocabulary-list-detail/vocabulary-list-detail.component';
import { ToastService } from '../../../Services/Toast/toast.service';
import { StreakService } from '../../../Services/streak/streak.service';
import { AuthService } from '../../../Services/Auth/auth.service';

@Component({
  selector: 'app-user-vocabulary',
  standalone: true,
  imports: [CommonModule, FormsModule, ReactiveFormsModule, HeaderComponent, VocabularyListDetailComponent],
  templateUrl: './vocabulary.component.html',
  styleUrls: ['./vocabulary.component.scss']
})

export class UserVocabularyComponent implements OnInit {
  Math = Math;

  categoryList = [
    {
      id: 'business',
      name: 'Business',
      iconClass: 'fas fa-briefcase text-blue-600',
      bgColor: 'bg-blue-100',
      wordCount: 245,
      progress: 68,
    },
    {
      id: 'technology',
      name: 'Technology',
      iconClass: 'fas fa-laptop text-green-600',
      bgColor: 'bg-green-100',
      wordCount: 189,
      progress: 45,
    }
  ];
  userLists: VocabularyListResponse[] = [];
  isLoadingLists = false;
  showAllLists = false;
  currentPage = 1;
  pageSize = 12;
  selectedVocabularyListDetail: any = null;

  isListModalOpen = false;
  listForm: FormGroup;
  isSubmitting = false;

  showDeleteModal = false;
  listToDelete: VocabularyListResponse | null = null;
  isDeleting = false;

  streakData: any = null;
  isLoadingStreak = false;

  // Login required modal
  showLoginRequiredModal = false;
  loginRequiredMessage = '';


  get showLimitedUserLists() {
    if (!this.showAllLists) {
      return this.userLists.slice(0, 6);
    } else {
      const startIdx = (this.currentPage - 1) * this.pageSize;
      return this.userLists.slice(startIdx, startIdx + this.pageSize);
    }
  }

  get totalPages() {
    return this.showAllLists ? Math.ceil(this.userLists.length / this.pageSize) : 1;
  }

  toggleShowAllLists() {
    this.showAllLists = !this.showAllLists;
    this.currentPage = 1;
  }

  nextPage() {
    if (this.currentPage < this.totalPages) {
      this.currentPage++;
    }
  }

  prevPage() {
    if (this.currentPage > 1) {
      this.currentPage--;
    }
  }

  goToPage(page: number) {
    if (page >= 1 && page <= this.totalPages) {
      this.currentPage = page;
    }
  }

  getPageNumbers(): number[] {
    const pages: number[] = [];
    for (let i = 1; i <= this.totalPages; i++) {
      pages.push(i);
    }
    return pages;
  }

  constructor(
    private router: Router,
    private vocabularyService: VocabularyService,
    private fb: FormBuilder,
    private toastService: ToastService,
    private streakService: StreakService,
    private authService: AuthService
  ) {
    this.listForm = this.fb.group({
      name: ['', [Validators.required, Validators.maxLength(100)]]
    });
  }

  ngOnInit() {
    this.loadUserLists();
    this.loadStreakData();
  }

  openVocabularyListDetail(list: VocabularyListResponse) {
    this.vocabularyService.getVocabularyListDetail(list.vocabularyListId).subscribe({
      next: (detail) => {
        this.selectedVocabularyListDetail = detail;
      }
    });
  }
  navigateToVocabularyList(list: VocabularyListResponse) {
    this.router.navigate(['/vocabulary/list', list.vocabularyListId]);
  }
  closeVocabularyListDetail() {
    this.selectedVocabularyListDetail = null;
  }

  startFlashcards(): void {
    if (!this.isLoggedIn()) {
      this.showLoginModal('bắt đầu học');
      return;
    }
    this.router.navigate(['/flashcards']);
  }

  startQuiz(): void {
    if (!this.isLoggedIn()) {
      this.showLoginModal('làm bài kiểm tra');
      return;
    }
    this.router.navigate(['/quiz/config']);
  }

  browseWords(): void {
    this.router.navigate(['/flashcards']);
  }

  viewAllProgress(): void {
    if (!this.isLoggedIn()) {
      this.showLoginModal('xem tiến độ học tập');
      return;
    }
    this.router.navigate(['/spaced-repetition/dashboard']);
  }

  openCategory(categoryId: string): void {
    console.log(`Open category: ${categoryId}`);
  }

  startDailyChallenge(): void {
    this.router.navigate(['/homepage/user-dashboard']);
  }

  loadStreakData(): void {
    const userId = this.authService.getCurrentUserId();
    if (!userId) {
      return;
    }

    this.isLoadingStreak = true;
    this.streakService.getStreakSummary(userId).subscribe({
      next: (response) => {
        if (response && response.success && response.data) {
          this.streakData = response.data;
        } else if (response && response.currentStreak !== undefined) {
          this.streakData = response;
        } else {
          this.streakData = null;
        }
        this.isLoadingStreak = false;
        console.log('Streak data loaded:', this.streakData);
      },
      error: (error: any) => {
        console.error('Error loading streak data:', error);
        this.streakData = null;
        this.isLoadingStreak = false;
      }
    });
  }


  getConsecutiveDays(): number {
    if (!this.streakData) return 0;
    return this.streakData.currentStreak ?? 0;
  }

  getStreakEmoji(): string {
    const streak = this.getConsecutiveDays();
    return this.streakService.getStreakEmoji(streak);
  }
  private loadUserLists(): void {
    this.isLoadingLists = true;
    this.vocabularyService.getMyVocabularyLists().subscribe({
      next: lists => {
        this.userLists = lists || [];
        this.isLoadingLists = false;
      },
      error: _ => { this.isLoadingLists = false; }
    });
  }

  openCreateListModal(): void {
    if (!this.isLoggedIn()) {
      this.showLoginModal('tạo thư mục mới');
      return;
    }
    this.isListModalOpen = true;
    this.listForm.reset();
  }

  closeCreateListModal(): void {
    this.isListModalOpen = false;
    this.listForm.reset();
  }

  saveNewList(): void {
    if (this.listForm.invalid || this.isSubmitting) {
      return;
    }

    this.isSubmitting = true;
    const listData: VocabularyListCreate = {
      name: this.listForm.value.name,
      isPublic: false
    };

    this.vocabularyService.createVocabularyList(listData).subscribe({
      next: (newList) => {
        this.toastService.success(`Đã tạo folder "${newList.name}" thành công!`);
        this.isSubmitting = false;
        this.closeCreateListModal();
        this.loadUserLists();
      },
      error: (err) => {
        this.toastService.error('Tạo folder thất bại. Vui lòng thử lại.');
        this.isSubmitting = false;
        console.error('Error creating vocabulary list:', err);
      }
    });
  }

  openDeleteModal(list: VocabularyListResponse, event: Event): void {
    event.stopPropagation();
    this.listToDelete = list;
    this.showDeleteModal = true;
  }

  closeDeleteModal(): void {
    this.showDeleteModal = false;
    this.listToDelete = null;
  }

  confirmDeleteList(): void {
    if (!this.listToDelete || this.isDeleting) {
      return;
    }

    this.isDeleting = true;
    this.vocabularyService.deleteVocabularyList(this.listToDelete.vocabularyListId).subscribe({
      next: () => {
        this.toastService.success(`Đã xóa folder "${this.listToDelete!.name}" thành công!`);
        this.isDeleting = false;
        this.closeDeleteModal();
        this.loadUserLists();
      },
      error: (err) => {
        this.toastService.error('Xóa folder thất bại. Vui lòng thử lại.');
        this.isDeleting = false;
        console.error('Error deleting vocabulary list:', err);
      }
    });
  }

  // Helper methods for login check
  private isLoggedIn(): boolean {
    return this.authService.getCurrentUser() !== null;
  }

  private showLoginModal(action: string): void {
    this.loginRequiredMessage = `Vui lòng đăng nhập để ${action}`;
    this.showLoginRequiredModal = true;
  }

  closeLoginModal(): void {
    this.showLoginRequiredModal = false;
    this.loginRequiredMessage = '';
  }

  navigateToLogin(): void {
    this.closeLoginModal();
    this.router.navigate(['/login']);
  }
}