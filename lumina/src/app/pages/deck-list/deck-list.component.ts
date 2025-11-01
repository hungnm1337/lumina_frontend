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
    return Math.ceil(this.decks.length / this.pageSize);
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

  handlePageClick(page: number | string): void {
    if (typeof page === 'number') {
      this.goToPage(page);
    }
  }

  getPageNumbers(): (number | string)[] {
    const pages: (number | string)[] = [];
    const total = this.totalPages;
    const current = this.currentPage;
    
    if (total <= 7) {
      // Nếu có ít hơn hoặc bằng 7 trang, hiển thị tất cả
      for (let i = 1; i <= total; i++) {
        pages.push(i);
      }
    } else {
      // Logic hiển thị thông minh khi có nhiều trang
      if (current <= 3) {
        // Hiển thị: 1, 2, 3, 4, ..., total
        for (let i = 1; i <= 4; i++) {
          pages.push(i);
        }
        pages.push('...');
        pages.push(total);
      } else if (current >= total - 2) {
        // Hiển thị: 1, ..., total-3, total-2, total-1, total
        pages.push(1);
        pages.push('...');
        for (let i = total - 3; i <= total; i++) {
          pages.push(i);
        }
      } else {
        // Hiển thị: 1, ..., current-1, current, current+1, ..., total
        pages.push(1);
        pages.push('...');
        pages.push(current - 1);
        pages.push(current);
        pages.push(current + 1);
        pages.push('...');
        pages.push(total);
      }
    }
    
    return pages;
  }

  getDeckIndex(deckIndexInPage: number): number {
    return (this.currentPage - 1) * this.pageSize + deckIndexInPage;
  }

  goBack(): void {
    this.router.navigate(['/tu-vung']);
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