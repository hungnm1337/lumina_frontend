import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, RouterModule } from '@angular/router';
import { Deck, FlashcardService, Term } from '../../Services/flashcard/flashcard.service';
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

  // Tracking statistics
  easyCount = 0;
  learningCount = 0;
  difficultCount = 0;

  constructor(
    private route: ActivatedRoute,
    private flashcardService: FlashcardService
  ) { }

  ngOnInit(): void {
    const deckId = this.route.snapshot.paramMap.get('id');
    if (deckId) {
      this.deck = this.flashcardService.getDeckById(deckId);
      this.terms = this.deck ? this.deck.terms : [];
      this.learningCount = this.terms.length; // Initially all are "learning"
    }
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
