import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { HeaderComponent } from '../../Common/header/header.component';
import { VocabularyService } from '../../../Services/Vocabulary/vocabulary.service';
import { VocabularyListResponse } from '../../../Interfaces/vocabulary.interfaces';

@Component({
  selector: 'app-quiz-config',
  standalone: true,
  imports: [CommonModule, FormsModule, HeaderComponent],
  templateUrl: './quiz-config.component.html',
  styleUrls: ['./quiz-config.component.scss']
})
export class QuizConfigComponent implements OnInit {
  folders: VocabularyListResponse[] = [];
  displayedFolders: VocabularyListResponse[] = [];
  isLoading = false;
  searchTerm = '';
  selectedFolder: VocabularyListResponse | null = null;
  
  // Pagination
  currentPage = 1;
  pageSize = 9;
  totalPages = 1;

  constructor(
    private router: Router,
    private vocabularyService: VocabularyService
  ) {}

  ngOnInit(): void {
    this.loadFolders();
  }

  loadFolders(): void {
    this.isLoading = true;
    this.vocabularyService.getMyAndStaffVocabularyLists(this.searchTerm).subscribe({
      next: (folders) => {
        // Only get folders with vocabulary (vocabularyCount > 0)
        this.folders = (folders || []).filter(f => f.vocabularyCount > 0);
        this.currentPage = 1; // Reset to first page when loading/searching
        this.updateDisplayedFolders();
        this.isLoading = false;
        
        // Load quiz scores sau khi load folders xong
        this.loadQuizScores();
      },
      error: (error) => {
        console.error('Error loading folders:', error);
        this.isLoading = false;
        this.folders = [];
        this.displayedFolders = [];
        this.totalPages = 1;
      }
    });
  }

  // Load quiz scores và map vào folders
  loadQuizScores(): void {
    this.vocabularyService.getQuizScores().subscribe({
      next: (scores) => {
        // Map scores vào folders
        const scoreMap = new Map<number, any>();
        scores.forEach(score => {
          scoreMap.set(score.vocabularyListId, score);
        });

        // Cập nhật folders với scores
        this.folders.forEach(folder => {
          const score = scoreMap.get(folder.vocabularyListId);
          if (score) {
            folder.bestScore = score.bestScore;
            folder.lastScore = score.lastScore;
            folder.lastCompletedAt = score.lastCompletedAt;
            folder.totalAttempts = score.totalAttempts;
          }
        });

        // Cập nhật displayed folders
        this.updateDisplayedFolders();
      },
      error: (error) => {
        console.error('Error loading quiz scores:', error);
        // Không hiển thị lỗi, chỉ log
      }
    });
  }

  updateDisplayedFolders(): void {
    this.totalPages = Math.ceil(this.folders.length / this.pageSize);
    const startIndex = (this.currentPage - 1) * this.pageSize;
    const endIndex = startIndex + this.pageSize;
    this.displayedFolders = this.folders.slice(startIndex, endIndex);
  }

  goToPage(page: number): void {
    if (page >= 1 && page <= this.totalPages) {
      this.currentPage = page;
      this.updateDisplayedFolders();
      // Scroll to top of folder grid
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }
  }

  previousPage(): void {
    if (this.currentPage > 1) {
      this.goToPage(this.currentPage - 1);
    }
  }

  nextPage(): void {
    if (this.currentPage < this.totalPages) {
      this.goToPage(this.currentPage + 1);
    }
  }

  getPageNumbers(): number[] {
    const pages: number[] = [];
    for (let i = 1; i <= this.totalPages; i++) {
      pages.push(i);
    }
    return pages;
  }

  onSearchChange(): void {
    // Can add debounce if needed
    this.loadFolders();
  }

  selectFolder(folder: VocabularyListResponse): void {
    this.selectedFolder = folder;
  }

  isSelected(folder: VocabularyListResponse): boolean {
    return this.selectedFolder?.vocabularyListId === folder.vocabularyListId;
  }

  startQuiz(): void {
    if (!this.selectedFolder) {
      alert('Please select a folder to take quiz!');
      return;
    }

    if (this.selectedFolder.vocabularyCount === 0) {
      alert('This folder has no vocabulary yet!');
      return;
    }

    // Navigate to quiz page with selected folder
    // Next step will be quiz configuration page (mode, number of questions, time)
    this.router.navigate(['/quiz/config-detail'], {
      queryParams: {
        folderId: this.selectedFolder.vocabularyListId,
        folderName: this.selectedFolder.name,
        wordCount: this.selectedFolder.vocabularyCount
      }
    });
  }

  goBack(): void {
    this.router.navigate(['/vocabulary']);
  }
}

