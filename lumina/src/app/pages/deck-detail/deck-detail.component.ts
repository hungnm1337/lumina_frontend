import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, RouterModule } from '@angular/router';
import { Deck, FlashcardService, Term } from '../../Services/flashcard/flashcard.service';
import { VocabularyService } from '../../Services/Vocabulary/vocabulary.service';
import { SpacedRepetitionService, SpacedRepetition, ReviewVocabularyRequest } from '../../Services/spaced-repetition/spaced-repetition.service';
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

  // Spaced Repetition
  spacedRepetition: SpacedRepetition | null = null;
  isReviewing = false;
  showReviewButtons = false;

  constructor(
    private route: ActivatedRoute,
    private flashcardService: FlashcardService,
    private vocabularyService: VocabularyService,
    private spacedRepetitionService: SpacedRepetitionService
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
        console.log('Deck loaded:', deck);
        if (deck) {
          this.deck = deck;
          this.terms = deck.terms || [];
          console.log('Terms loaded:', this.terms.length);
          this.learningCount = this.terms.length; // Initially all are "learning"

          // Load thông tin chi tiết của list để có title và author
          this.loadDeckInfo(deckId);

          // Load hoặc tạo SpacedRepetition
          this.loadOrCreateSpacedRepetition(deckId);
        } else {
          this.error = 'Không tìm thấy bộ từ vựng này hoặc bộ từ vựng này chưa được xuất bản';
        }
        this.isLoading = false;
      },
      error: (error) => {
        console.error('Error loading deck:', error);
        console.error('Error details:', JSON.stringify(error, null, 2));
        // Hiển thị thông báo lỗi chi tiết hơn
        if (error.status === 404) {
          this.error = 'Không tìm thấy bộ từ vựng này hoặc bộ từ vựng này chưa được xuất bản';
        } else if (error.status === 0) {
          this.error = 'Không thể kết nối đến server. Vui lòng kiểm tra kết nối mạng.';
        } else {
          this.error = `Không thể tải bộ từ vựng. Lỗi: ${error.message || 'Vui lòng thử lại sau.'}`;
        }
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

  playAudio(event: Event, termIndex?: number): void {
    event.stopPropagation(); // Prevent card flip when clicking audio

    // Nếu có termIndex (từ danh sách từ vựng), dùng term đó, nếu không dùng currentTermIndex (từ flashcard chính)
    const index = termIndex !== undefined ? termIndex : this.currentTermIndex;
    const term = this.terms[index];

    if (!term) return;

    const audioUrl = term.audioUrl;
    const word = term.question;

    if (audioUrl) {
      // Nếu có audioUrl, phát audio từ URL
      const audio = new Audio(audioUrl);
      audio.play().catch(err => {
        console.error('Error playing audio:', err);
        // Nếu lỗi, fallback sang TTS
        this.speakWord(word);
      });
    } else if (word) {
      // Nếu không có audioUrl, dùng Text-to-Speech
      this.speakWord(word);
    }
  }

  // Hàm Text-to-Speech sử dụng Web Speech API
  private speakWord(word?: string): void {
    if (!word) return;

    // Kiểm tra browser có hỗ trợ Speech Synthesis không
    if ('speechSynthesis' in window) {
      // Dừng các audio đang phát (nếu có)
      window.speechSynthesis.cancel();

      const utterance = new SpeechSynthesisUtterance(word);
      utterance.lang = 'en-US'; // Phát âm tiếng Anh
      utterance.rate = 0.9; // Tốc độ nói (0.1 - 10)
      utterance.pitch = 1; // Cao độ (0 - 2)

      window.speechSynthesis.speak(utterance);
    } else {
      console.warn('Browser không hỗ trợ Text-to-Speech');
    }
  }
  private loadOrCreateSpacedRepetition(deckId: string): void {
    const listId = parseInt(deckId);
    if (isNaN(listId)) return;

    // Chỉ load SpacedRepetition nếu đã có (đã được đánh giá trước đó)
    // KHÔNG tự động tạo record mới - chỉ tạo khi người dùng đánh giá
    this.spacedRepetitionService.getByList(listId).subscribe({
      next: (repetition) => {
        this.spacedRepetition = repetition;
        console.log('SpacedRepetition loaded:', repetition);
      },
      error: (error) => {
        // Nếu không tìm thấy (404), không tạo mới - chỉ log
        // Record sẽ được tạo khi người dùng đánh giá lần đầu
        if (error.status === 404) {
          console.log('Chưa có SpacedRepetition - sẽ tạo khi đánh giá');
          this.spacedRepetition = null;
        } else {
          console.error('Error loading SpacedRepetition:', error);
        }
      }
    });
  }

  // Review vocabulary với quality 0-5
  reviewVocabulary(quality: number): void {
    if (this.isReviewing) return;

    this.isReviewing = true;

    // Nếu chưa có spacedRepetition, cần tạo mới trước khi đánh giá
    if (!this.spacedRepetition) {
      const listId = parseInt(this.deckId || '');
      if (isNaN(listId)) {
        alert('Không thể xác định bộ từ vựng. Vui lòng thử lại.');
        this.isReviewing = false;
        return;
      }

      // Tạo record mới trước khi đánh giá
      this.spacedRepetitionService.createRepetition(listId).subscribe({
        next: (newRepetition) => {
          this.spacedRepetition = newRepetition;
          // Sau khi tạo xong, tiếp tục đánh giá
          this.performReview(quality);
        },
        error: (createError) => {
          console.error('Error creating SpacedRepetition:', createError);
          alert('Có lỗi xảy ra khi tạo bản ghi. Vui lòng thử lại.');
          this.isReviewing = false;
        }
      });
    } else {
      // Đã có record, đánh giá trực tiếp
      this.performReview(quality);
    }
  }

  // Thực hiện đánh giá
  private performReview(quality: number): void {
    // Lấy term hiện tại để lấy VocabularyId
    const currentTerm = this.terms[this.currentTermIndex];
    if (!currentTerm) {
      alert('Không tìm thấy từ vựng. Vui lòng thử lại.');
      this.isReviewing = false;
      return;
    }

    const listId = parseInt(this.deckId || '');
    if (isNaN(listId)) {
      alert('Không thể xác định bộ từ vựng. Vui lòng thử lại.');
      this.isReviewing = false;
      return;
    }

    // Gửi VocabularyId và VocabularyListId để tạo/tìm record theo word level
    const request: ReviewVocabularyRequest = {
      vocabularyId: currentTerm.id, // VocabularyId từ term
      vocabularyListId: listId,
      quality: quality
    };

    this.spacedRepetitionService.reviewVocabulary(request).subscribe({
      next: (response) => {
        if (response.success && response.updatedRepetition) {
          this.spacedRepetition = response.updatedRepetition;
          this.showReviewButtons = false;
          console.log('Review successful:', response);

          // Hiển thị thông báo thành công
          alert(`Đã đánh giá thành công! Lần review tiếp theo: ${this.formatNextReviewDate(response.nextReviewAt)}`);
        }
        this.isReviewing = false;
      },
      error: (error) => {
        console.error('Error reviewing vocabulary:', error);
        alert('Có lỗi xảy ra khi đánh giá. Vui lòng thử lại.');
        this.isReviewing = false;
      }
    });
  }

  // Hiển thị nút đánh giá
  showReviewOptions(): void {
    this.showReviewButtons = true;
  }

  // Ẩn nút đánh giá
  hideReviewOptions(): void {
    this.showReviewButtons = false;
  }

  // Format ngày review tiếp theo
  formatNextReviewDate(dateString: string | null | undefined): string {
    if (!dateString) return 'Chưa xác định';

    const date = new Date(dateString);
    const now = new Date();
    const diffTime = date.getTime() - now.getTime();
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

    if (diffDays <= 0) {
      return 'Hôm nay';
    } else if (diffDays === 1) {
      return 'Ngày mai';
    } else {
      return `${diffDays} ngày nữa`;
    }
  }

  // Lấy màu sắc cho quality button
  getQualityButtonClass(quality: number): string {
    if (quality <= 1) return 'quality-poor';
    if (quality <= 2) return 'quality-fair';
    if (quality <= 3) return 'quality-good';
    return 'quality-excellent';
  }

  // Lấy label cho quality button
  getQualityLabel(quality: number): string {
    const labels = ['Không nhớ', 'Nhớ kém', 'Nhớ vừa', 'Nhớ tốt', 'Nhớ rất tốt', 'Nhớ xuất sắc'];
    return labels[quality] || 'Đánh giá';
  }

  jumpToTerm(index: number): void {
    this.currentTermIndex = index;
    this.isFlipped = false;
    // Scroll lên đầu flashcard
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }
}
