import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, RouterModule } from '@angular/router';
import { Deck, FlashcardService, Term } from '../../Services/flashcard/flashcard.service';
import { VocabularyService } from '../../Services/Vocabulary/vocabulary.service';
import { HeaderComponent } from '../../Views/Common/header/header.component';

@Component({
  selector: 'app-deck-detail',
  standalone: true,
  imports: [CommonModule, HeaderComponent, RouterModule],
  templateUrl: './deck-detail.component.html',
  styleUrls: ['./deck-detail.component.scss']
})
export class DeckDetailComponent implements OnInit {
  deck: Deck | undefined;
  terms: Term[] = [];
  currentTermIndex = 0;
  isFlipped = false;
  isLoading = true;
  error: string | null = null;
  deckId: string | null = null;

  // Tracking statistics
  easyCount = 0;
  learningCount = 0;
  difficultCount = 0;

  constructor(
    private route: ActivatedRoute,
    private flashcardService: FlashcardService,
    private vocabularyService: VocabularyService
  ) { }

  ngOnInit(): void {
    this.deckId = this.route.snapshot.paramMap.get('id');
    if (this.deckId) {
      this.loadDeck(this.deckId);
    } else {
      this.error = 'ID bộ từ vựng không hợp lệ';
      this.isLoading = false;
    }
  }

  loadDeck(deckId: string): void {
    this.isLoading = true;
    this.error = null;

    this.flashcardService.getDeckById(deckId).subscribe({
      next: (deck) => {
        if (deck) {
          this.deck = deck;
          this.terms = deck.terms;
          this.learningCount = this.terms.length; // Initially all are "learning"
          
          // Load thông tin chi tiết của list để có title và author
          this.loadDeckInfo(deckId);
        } else {
          this.error = 'Không tìm thấy bộ từ vựng này';
        }
        this.isLoading = false;
      },
      error: (error) => {
        console.error('Error loading deck:', error);
        this.error = 'Không thể tải bộ từ vựng. Vui lòng thử lại sau.';
        this.isLoading = false;
      }
    });
  }

  private loadDeckInfo(deckId: string): void {
    const listId = parseInt(deckId);
    if (isNaN(listId)) return;

    this.vocabularyService.getPublicVocabularyLists().subscribe({
      next: (lists) => {
        const list = lists.find(l => l.vocabularyListId === listId);
        if (list && this.deck) {
          this.deck.title = list.name;
          this.deck.author = list.makeByName;
        }
      },
      error: (error) => {
        console.error('Error loading deck info:', error);
        // Không cần hiển thị lỗi vì deck đã load được
      }
    });
  }

  previousTerm(): void {
    if (this.currentTermIndex > 0) {
      this.currentTermIndex--;
      this.isFlipped = false;
    }
  }

  nextTerm(): void {
    if (this.currentTermIndex < this.terms.length - 1) {
      this.currentTermIndex++;
      this.isFlipped = false;
    }
  }

  toggleFlip(): void {
    this.isFlipped = !this.isFlipped;
  }

  markAsEasy(): void {
    if (this.learningCount > 0) {
      this.learningCount--;
      this.easyCount++;
    }
    this.nextTerm();
  }

  markAsDifficult(): void {
    if (this.learningCount > 0) {
      this.learningCount--;
      this.difficultCount++;
    }
    this.nextTerm();
  }

  playAudio(event: Event): void {
    event.stopPropagation(); // Prevent card flip when clicking audio
    // TODO: Implement audio playback logic
    console.log('Playing audio for:', this.terms[this.currentTermIndex].question);
  }
   jumpToTerm(index: number): void {
    this.currentTermIndex = index;
    this.isFlipped = false;
    // Scroll lên đầu flashcard
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }
}
