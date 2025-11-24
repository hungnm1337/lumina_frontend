import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule, ReactiveFormsModule, FormBuilder, FormGroup, Validators } from '@angular/forms';
import { HeaderComponent } from '../../Common/header/header.component';
import { ActivatedRoute, Router } from '@angular/router';
import { VocabularyService } from '../../../Services/Vocabulary/vocabulary.service';
import { VocabularyListResponse, VocabularyListCreate } from '../../../Interfaces/vocabulary.interfaces';
import { VocabularyListDetailComponent } from '../vocabulary-list-detail/vocabulary-list-detail.component';
import { ToastService } from '../../../Services/Toast/toast.service';

@Component({
  selector: 'app-user-vocabulary',
  standalone: true,
  imports: [CommonModule, FormsModule, ReactiveFormsModule, HeaderComponent, VocabularyListDetailComponent],
  templateUrl: './vocabulary.component.html',
  styleUrls: ['./vocabulary.component.scss']
})

export class UserVocabularyComponent implements OnInit {
  Math = Math;

  // Sample data for category list
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
  
  // Modal state for creating new folder
  isListModalOpen = false;
  listForm: FormGroup;
  isSubmitting = false;


  get showLimitedUserLists() {
    if (!this.showAllLists) {
      return this.userLists.slice(0, 6);
    } else {
      // Pagination when showAllLists
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
    private toastService: ToastService
  ) {
    // Form for creating new vocabulary list (private folder only)
    this.listForm = this.fb.group({
      name: ['', [Validators.required, Validators.maxLength(100)]]
    });
  }

  ngOnInit() {
    // Vocabulary component for User
    this.loadUserLists();
  }

  openVocabularyListDetail(list: VocabularyListResponse) {
    // Assume API returns correct detail
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

  // Event handler functions
  startFlashcards(): void {
    this.router.navigate(['/flashcards']); 
  }

  startQuiz(): void {
    // Navigate to quiz config page to select folder
    this.router.navigate(['/quiz/config']);
  }

  browseWords(): void {
    // Navigate to flashcards page to view all decks
    this.router.navigate(['/flashcards']);
  }

  // View all progress - Navigate to Spaced Repetition Dashboard
  viewAllProgress(): void {
    this.router.navigate(['/spaced-repetition/dashboard']);
  }

  openCategory(categoryId: string): void {
    console.log(`Open category: ${categoryId}`);
    // Handle navigation logic to vocabulary list page with filter
  }

  startDailyChallenge(): void {
    console.log('Start daily challenge...');
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

  // Modal methods for creating new folder
  openCreateListModal(): void {
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
    // Always set isPublic to false for personal folders
    const listData: VocabularyListCreate = {
      name: this.listForm.value.name,
      isPublic: false
    };
    
    this.vocabularyService.createVocabularyList(listData).subscribe({
      next: (newList) => {
        this.toastService.success(`Đã tạo folder "${newList.name}" thành công!`);
        this.isSubmitting = false;
        this.closeCreateListModal();
        this.loadUserLists(); // Refresh the list
      },
      error: (err) => {
        this.toastService.error('Tạo folder thất bại. Vui lòng thử lại.');
        this.isSubmitting = false;
        console.error('Error creating vocabulary list:', err);
      }
    });
  }
}