import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { HeaderComponent } from '../../Common/header/header.component';
import { ActivatedRoute, Router } from '@angular/router';
import { VocabularyService } from '../../../Services/Vocabulary/vocabulary.service';
import { VocabularyListResponse } from '../../../Interfaces/vocabulary.interfaces';
import { VocabularyListDetailComponent } from '../vocabulary-list-detail/vocabulary-list-detail.component';

@Component({
  selector: 'app-user-vocabulary',
  standalone: true,
  imports: [CommonModule, HeaderComponent, VocabularyListDetailComponent],
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
  
  constructor(
    private router: Router,
    private vocabularyService: VocabularyService
  ) { }

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
}