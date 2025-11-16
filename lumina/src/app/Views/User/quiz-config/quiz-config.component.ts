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
  isLoading = false;
  searchTerm = '';
  selectedFolder: VocabularyListResponse | null = null;

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
        this.isLoading = false;
      },
      error: (error) => {
        console.error('Error loading folders:', error);
        this.isLoading = false;
        this.folders = [];
      }
    });
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

