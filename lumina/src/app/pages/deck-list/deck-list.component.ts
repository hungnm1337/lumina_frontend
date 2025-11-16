import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router, RouterModule } from '@angular/router';
import { Deck, FlashcardService } from '../../Services/flashcard/flashcard.service'; 
import { HeaderComponent } from '../../Views/Common/header/header.component'; 

@Component({
  selector: 'app-deck-list',
  standalone: true,
  imports: [CommonModule, RouterModule, HeaderComponent], // Thêm RouterModule để dùng routerLink
  templateUrl: './deck-list.component.html',
  styleUrls: ['./deck-list.component.scss']
})
export class DeckListComponent implements OnInit {
  decks: Deck[] = [];
  isLoading = true;
  error: string | null = null;
  currentPage = 1;
  pageSize = 9;

  constructor(
    private flashcardService: FlashcardService,
    private router: Router
  ) { }

  ngOnInit(): void {
    this.loadDecks();
  }

  get paginatedDecks(): Deck[] {
    const startIdx = (this.currentPage - 1) * this.pageSize;
    return this.decks.slice(startIdx, startIdx + this.pageSize);
  }

  get totalPages(): number {
    return Math.max(1, Math.ceil(this.decks.length / this.pageSize));
  }

  nextPage(): void {
    if (this.currentPage < this.totalPages) {
      this.currentPage++;
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }
  }

  prevPage(): void {
    if (this.currentPage > 1) {
      this.currentPage--;
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }
  }

  goToPage(page: number): void {
    if (page >= 1 && page <= this.totalPages) {
      this.currentPage = page;
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }
  }

  getPageNumbers(): number[] {
    const total = this.totalPages;
    const pages: number[] = [];
    for (let i = 1; i <= total; i++) pages.push(i);
    return pages;
  }

  getDeckIndex(deckIndexInPage: number): number {
    return (this.currentPage - 1) * this.pageSize + deckIndexInPage;
  }

  goBack(): void {
    this.router.navigate(['/vocabulary']);
  }

  loadDecks(): void {
    this.isLoading = true;
    this.error = null;
    this.currentPage = 1; // Reset về trang đầu khi tải lại
    
    this.flashcardService.getDecks().subscribe({
      next: (decks) => {
        this.decks = decks;
        this.isLoading = false;
      },
      error: (error) => {
        console.error('Error loading decks:', error);
        this.error = 'Không thể tải danh sách từ vựng. Vui lòng thử lại sau.';
        this.isLoading = false;
      }
    });
  }
}