import { CommonModule } from '@angular/common';
import { Component, Input, Output, EventEmitter, OnInit } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { VocabularyService } from '../../../Services/Vocabulary/vocabulary.service';
import { HeaderComponent } from '../../Common/header/header.component';


export interface VocabularyItem {
  question: string;
  answer: string;
  topic?: string;
  level?: string;
  audioUrl?: string;
  liked?: boolean; // Thêm trường để đánh dấu yêu thích
}


export interface VocabularyListDetail {
  vocabularyListId: number;
  name: string;
  createAt?: string;
  status?: string;
  vocabularyCount: number;
  words: VocabularyItem[];
  [key: string]: any;
}


@Component({
  selector: 'app-vocabulary-list-detail',
  standalone: true,
  imports: [CommonModule, FormsModule, HeaderComponent],
  templateUrl: './vocabulary-list-detail.component.html',
  styleUrls: ['./vocabulary-list-detail.component.scss']
})
export class VocabularyListDetailComponent implements OnInit {
  @Input() vocabularyList: VocabularyListDetail | null = null;
  @Output() close = new EventEmitter();


  searchTerm: string = '';
  selectedTopic: string = 'Tất cả';
  selectedLevel: string = 'Tất cả';
  shownCount = 12;


  constructor(
    private route: ActivatedRoute,
    private router: Router,
    private vocabularyService: VocabularyService
  ) {}


  ngOnInit(): void {
    // Nếu component được mở qua route (không truyền @Input), tự fetch theo param :id
    if (!this.vocabularyList) {
      const idParam = this.route.snapshot.paramMap.get('id');
      const listId = idParam ? Number(idParam) : NaN;
      if (!Number.isNaN(listId)) {
        // Thử lấy public words trước cho user thông thường
        this.vocabularyService.getPublicVocabularyByList(listId).subscribe({
          next: (publicWords: any[]) => {
            if (Array.isArray(publicWords) && publicWords.length > 0) {
              this.vocabularyList = {
                vocabularyListId: listId,
                name: 'Vocabulary List',
                vocabularyCount: publicWords.length,
                words: publicWords.map((w: any) => ({
                  question: w.word || '',
                  answer: w.definition || '',
                  topic: w.category
                }))
              } as VocabularyListDetail;
            } else {
              this.fetchPrivateListDetail(listId);
            }
          },
          error: () => this.fetchPrivateListDetail(listId)
        });
      }
    }
  }


  private fetchPrivateListDetail(listId: number): void {
    this.vocabularyService.getVocabularyListDetail(listId).subscribe({
          next: (detail: any) => {
            // Nếu backend chưa trả mảng words, fallback tự load vocabularies theo listId
            if (!detail?.words) {
              this.vocabularyService.getVocabularies(listId).subscribe({
                next: (words) => {
                  this.vocabularyList = {
                    vocabularyListId: listId,
                    name: detail?.name || 'Vocabulary List',
                    vocabularyCount: Array.isArray(words) ? words.length : 0,
                    words: (words || []).map((w: any) => ({
                      question: w.word || w.question || '',
                      answer: w.definition || w.answer || '',
                      topic: w.category,
                      level: undefined,
                      audioUrl: w.audioUrl
                    }))
                  } as VocabularyListDetail;
                },
                error: () => {
                  this.vocabularyList = {
                    vocabularyListId: listId,
                    name: detail?.name || 'Vocabulary List',
                    vocabularyCount: 0,
                    words: []
                  } as VocabularyListDetail;
                }
              });
            } else {
              this.vocabularyList = detail as VocabularyListDetail;
            }
          },
          error: () => {
            // Nếu gọi detail lỗi (do backend chưa implement), vẫn cố gắng lấy vocabularies theo listId
            this.vocabularyService.getVocabularies(listId).subscribe({
              next: (words) => {
                this.vocabularyList = {
                  vocabularyListId: listId,
                  name: 'Vocabulary List',
                  vocabularyCount: Array.isArray(words) ? words.length : 0,
                  words: (words || []).map((w: any) => ({
                    question: w.word || '',
                    answer: w.definition || '',
                    topic: w.category,
                    audioUrl: w.audioUrl
                  }))
                } as VocabularyListDetail;
              },
              error: () => {
                this.vocabularyList = {
                  vocabularyListId: listId,
                  name: 'Vocabulary List',
                  vocabularyCount: 0,
                  words: []
                } as VocabularyListDetail;
              }
            });
          }
        });
  }


  get uniqueTopics(): string[] {
    if (!this.vocabularyList?.words) return [];
    const topics = this.vocabularyList.words.map(w => w.topic).filter((t): t is string => Boolean(t));
    return Array.from(new Set(topics));
  }


  get uniqueLevels(): string[] {
    if (!this.vocabularyList?.words) return [];
    const levels = this.vocabularyList.words.map(w => w.level).filter((l): l is string => Boolean(l));
    return Array.from(new Set(levels));
  }


  get filteredWords(): VocabularyItem[] {
    if (!this.vocabularyList?.words) return [];
    let result = this.vocabularyList.words;
    if (this.searchTerm) {
      const term = this.searchTerm.toLowerCase();
      result = result.filter(w =>
        w.question?.toLowerCase().includes(term) || w.answer?.toLowerCase().includes(term)
      );
    }
    if (this.selectedTopic !== 'Tất cả') {
      result = result.filter(w => w.topic === this.selectedTopic);
    }
    if (this.selectedLevel !== 'Tất cả') {
      result = result.filter(w => w.level === this.selectedLevel);
    }
    return result;
  }


  // Cập nhật hàm playAudio để hỗ trợ Text-to-Speech
  playAudio(audioUrl?: string, word?: string) {
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
  private speakWord(word?: string) {
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


  toggleLike(wordIdx: number): void {
    if (this.filteredWords[wordIdx]) {
      this.filteredWords[wordIdx].liked = !this.filteredWords[wordIdx].liked;
    }
  }


  goBack(): void {
    if (this.close.observers.length > 0) {
      this.close.emit();
    } else {
      this.router.navigate(['/tu-vung']);
    }
  }
}