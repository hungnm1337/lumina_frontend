import { CommonModule } from '@angular/common';
import { Component, Input, Output, EventEmitter, OnInit } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { FormsModule, ReactiveFormsModule, FormBuilder, FormGroup, Validators } from '@angular/forms';
import { VocabularyService } from '../../../Services/Vocabulary/vocabulary.service';
import { HeaderComponent } from '../../Common/header/header.component';


export interface VocabularyItem {
  id?: number; // ID của từ vựng để update/delete
  question: string;
  answer: string;
  topic?: string;
  level?: string;
  audioUrl?: string;
  example?: string; // Ví dụ sử dụng từ
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
  imports: [CommonModule, FormsModule, ReactiveFormsModule, HeaderComponent],
  templateUrl: './vocabulary-list-detail.component.html',
  styleUrls: ['./vocabulary-list-detail.component.scss']
})
export class VocabularyListDetailComponent implements OnInit {
  @Input() vocabularyList: VocabularyListDetail | null = null;
  @Output() close = new EventEmitter();


  searchTerm: string = '';
  selectedTopic: string = 'Tất cả';
  selectedLevel: string = 'Tất cả';
  
  // Pagination
  currentPage = 1;
  pageSize = 9;
  
  // Modal state
  isAddWordModalOpen = false;
  isSubmitting = false;
  addWordForm: FormGroup;
  
  // Detail modal state
  isDetailModalOpen = false;
  selectedWord: VocabularyItem | null = null;
  selectedWordId: number | null = null;
  isEditMode = false;
  editWordForm: FormGroup;
  


  constructor(
    private route: ActivatedRoute,
    private router: Router,
    private vocabularyService: VocabularyService,
    private fb: FormBuilder
  ) {
    // Initialize form - 4 trường: word, definition, category (loại từ), example (ví dụ)
    this.addWordForm = this.fb.group({
      word: ['', [Validators.required, Validators.maxLength(100)]],
      definition: ['', [Validators.required, Validators.maxLength(500)]],
      category: [''], // Loại từ - sẽ map vào category trong database
      example: [''] // Ví dụ
    });
    
    // Form chỉnh sửa từ vựng
    this.editWordForm = this.fb.group({
      word: ['', [Validators.required, Validators.maxLength(100)]],
      definition: ['', [Validators.required, Validators.maxLength(500)]],
      category: [''],
      example: ['']
    });
  }


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
    // Luôn load từ vocabularies API để đảm bảo có ID, đồng thời lấy tên list từ detail API
    this.vocabularyService.getVocabularyListDetail(listId).subscribe({
      next: (detail: any) => {
        // Load từ vocabularies API để đảm bảo có ID
        this.vocabularyService.getVocabularies(listId).subscribe({
          next: (words) => {
            console.log('Loaded vocabularies from API:', words);
            this.vocabularyList = {
              vocabularyListId: listId,
              name: detail?.name || 'Vocabulary List',
              createAt: detail?.createAt,
              status: detail?.status,
              vocabularyCount: Array.isArray(words) ? words.length : 0,
              words: (words || []).map((w: any) => {
                console.log('📦 Original word data:', w);
                console.log('📦 Checking ID:', {
                  'w.id': w.id,
                  'w.id type': typeof w.id,
                  'w.vocabularyId': w.vocabularyId,
                  'w.vocabularyId type': typeof w.vocabularyId,
                  'w keys': Object.keys(w)
                });
                
                // Thử nhiều cách lấy ID
                let wordId: number | undefined = undefined;
                if (w.id !== undefined && w.id !== null) {
                  wordId = Number(w.id);
                } else if (w.vocabularyId !== undefined && w.vocabularyId !== null) {
                  wordId = Number(w.vocabularyId);
                } else if (w.VocabularyId !== undefined && w.VocabularyId !== null) {
                  wordId = Number(w.VocabularyId);
                } else if (w.ID !== undefined && w.ID !== null) {
                  wordId = Number(w.ID);
                }
                
                const mapped = {
                  id: wordId,
                  question: w.word || w.question || '',
                  answer: w.definition || w.answer || '',
                  topic: w.category,
                  level: undefined,
                  audioUrl: w.audioUrl,
                  example: w.example
                };
                
                console.log('✅ Mapped word:', mapped);
                console.log('✅ Has ID?', !!mapped.id, 'ID value:', mapped.id);
                
                if (!mapped.id) {
                  console.error('❌ Word missing ID! Full object:', JSON.stringify(w, null, 2));
                }
                
                return mapped;
              })
            } as VocabularyListDetail;
          },
          error: (err) => {
            console.error('Error loading vocabularies:', err);
            this.vocabularyList = {
              vocabularyListId: listId,
              name: detail?.name || 'Vocabulary List',
              vocabularyCount: 0,
              words: []
            } as VocabularyListDetail;
          }
        });
      },
          error: () => {
            // Nếu gọi detail lỗi (do backend chưa implement), vẫn cố gắng lấy vocabularies theo listId
            this.vocabularyService.getVocabularies(listId).subscribe({
              next: (words) => {
                console.log('Loaded vocabularies (fallback):', words);
                this.vocabularyList = {
                  vocabularyListId: listId,
                  name: 'Vocabulary List',
                  vocabularyCount: Array.isArray(words) ? words.length : 0,
                  words: (words || []).map((w: any) => {
                    // Thử nhiều cách lấy ID
                    let wordId: number | undefined = undefined;
                    if (w.id !== undefined && w.id !== null) {
                      wordId = Number(w.id);
                    } else if (w.vocabularyId !== undefined && w.vocabularyId !== null) {
                      wordId = Number(w.vocabularyId);
                    } else if (w.VocabularyId !== undefined && w.VocabularyId !== null) {
                      wordId = Number(w.VocabularyId);
                    } else if (w.ID !== undefined && w.ID !== null) {
                      wordId = Number(w.ID);
                    }
                    
                    return {
                      id: wordId,
                      question: w.word || '',
                      answer: w.definition || '',
                      topic: w.category,
                      audioUrl: w.audioUrl,
                      example: w.example
                    };
                  })
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

  // Pagination helpers
  get totalItems(): number {
    return this.filteredWords.length;
  }

  get totalPages(): number {
    return Math.max(1, Math.ceil(this.totalItems / this.pageSize));
  }

  get paginatedWords(): VocabularyItem[] {
    const startIdx = (this.currentPage - 1) * this.pageSize;
    return this.filteredWords.slice(startIdx, startIdx + this.pageSize);
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


  openAddWordModal(): void {
    const listId = this.vocabularyList?.vocabularyListId;
    if (!listId) {
      alert('Không tìm thấy danh sách từ vựng');
      return;
    }
    
    // Kiểm tra xem list có thuộc về user hiện tại không
    // Lấy thông tin từ API để xác nhận quyền sở hữu
    this.vocabularyService.getVocabularyListDetail(listId).subscribe({
      next: (detail: any) => {
        // Nếu có detail, cho phép mở modal
    this.addWordForm.reset({
      word: '',
      definition: '',
      category: '',
      example: ''
    });
        this.isAddWordModalOpen = true;
      },
      error: (error) => {
        // Nếu không có quyền, hiển thị thông báo
        if (error.status === 403 || error.status === 404) {
          alert('Bạn chỉ có thể thêm từ vào danh sách của chính mình.');
        } else {
          alert('Không thể mở form thêm từ. Vui lòng thử lại.');
        }
      }
    });
  }

  closeAddWordModal(): void {
    this.isAddWordModalOpen = false;
    this.addWordForm.reset();
  }

  saveNewWord(): void {
    if (this.addWordForm.invalid || this.isSubmitting) {
      // Mark all fields as touched to show validation errors
      Object.keys(this.addWordForm.controls).forEach(key => {
        this.addWordForm.get(key)?.markAsTouched();
      });
      return;
    }

    const listId = this.vocabularyList?.vocabularyListId;
    if (!listId) {
      alert('Không tìm thấy danh sách từ vựng');
      return;
    }

    this.isSubmitting = true;
    const formValue = this.addWordForm.value;

    const vocabularyData = {
      vocabularyListId: listId,
      word: formValue.word.trim(),
      typeOfWord: 'Noun', // Giá trị mặc định vì backend yêu cầu field này
      definition: formValue.definition.trim(),
      category: formValue.category?.trim() || undefined, // Loại từ - map vào category
      example: formValue.example?.trim() || undefined // Ví dụ
    };

    this.vocabularyService.createVocabulary(vocabularyData).subscribe({
      next: (response) => {
        console.log('Từ vựng đã được thêm thành công:', response);
        this.isSubmitting = false;
        this.closeAddWordModal();
        
        // Reload vocabulary list
        this.reloadVocabularyList(listId);
      },
      error: (error) => {
        console.error('Lỗi khi thêm từ vựng:', error);
        this.isSubmitting = false;
        
        let errorMsg = 'Không thể thêm từ vựng. Vui lòng thử lại.';
        
        if (error.status === 403) {
          errorMsg = error?.error?.message || 'Bạn không có quyền thêm từ vào danh sách này. Chỉ có thể thêm vào danh sách của chính bạn.';
        } else if (error.status === 401) {
          errorMsg = 'Phiên đăng nhập đã hết hạn. Vui lòng đăng nhập lại.';
        } else if (error.error?.message) {
          errorMsg = error.error.message;
        }
        
        alert(errorMsg);
      }
    });
  }

  private reloadVocabularyList(listId: number): void {
    // Reload vocabulary list detail
    this.vocabularyService.getVocabularyListDetail(listId).subscribe({
      next: (detail: any) => {
        if (!detail?.words) {
          // Fallback: load vocabularies by listId
          this.vocabularyService.getVocabularies(listId).subscribe({
            next: (words) => {
              if (this.vocabularyList) {
                this.vocabularyList.words = (words || []).map((w: any) => {
                  // Thử nhiều cách lấy ID
                  let wordId: number | undefined = undefined;
                  if (w.id !== undefined && w.id !== null) {
                    wordId = Number(w.id);
                  } else if (w.vocabularyId !== undefined && w.vocabularyId !== null) {
                    wordId = Number(w.vocabularyId);
                  } else if (w.VocabularyId !== undefined && w.VocabularyId !== null) {
                    wordId = Number(w.VocabularyId);
                  } else if (w.ID !== undefined && w.ID !== null) {
                    wordId = Number(w.ID);
                  }
                  
                  return {
                    id: wordId,
                    question: w.word || '',
                    answer: w.definition || '',
                    topic: w.category,
                    level: undefined,
                    audioUrl: w.audioUrl,
                    example: w.example
                  };
                });
                this.vocabularyList.vocabularyCount = this.vocabularyList.words.length;
                // Reset to first page
                this.currentPage = 1;
              }
            },
            error: () => {
              console.error('Không thể reload từ vựng');
            }
          });
        } else {
          if (this.vocabularyList) {
            // Map lại để đảm bảo có ID
            this.vocabularyList.words = (detail.words || []).map((w: any) => {
              // Thử nhiều cách lấy ID
              let wordId: number | undefined = undefined;
              if (w.id !== undefined && w.id !== null) {
                wordId = Number(w.id);
              } else if (w.vocabularyId !== undefined && w.vocabularyId !== null) {
                wordId = Number(w.vocabularyId);
              } else if (w.VocabularyId !== undefined && w.VocabularyId !== null) {
                wordId = Number(w.VocabularyId);
              } else if (w.ID !== undefined && w.ID !== null) {
                wordId = Number(w.ID);
              }
              
              return {
                id: wordId,
                question: w.word || w.question || '',
                answer: w.definition || w.answer || '',
                topic: w.category || w.topic,
                level: w.level,
                audioUrl: w.audioUrl,
                example: w.example
              };
            });
            this.vocabularyList.vocabularyCount = this.vocabularyList.words.length;
            this.currentPage = 1;
          }
        }
      },
      error: () => {
        // Fallback: load vocabularies by listId
        this.vocabularyService.getVocabularies(listId).subscribe({
          next: (words) => {
            if (this.vocabularyList) {
              this.vocabularyList.words = (words || []).map((w: any) => {
                // Thử nhiều cách lấy ID
                let wordId: number | undefined = undefined;
                if (w.id !== undefined && w.id !== null) {
                  wordId = Number(w.id);
                } else if (w.vocabularyId !== undefined && w.vocabularyId !== null) {
                  wordId = Number(w.vocabularyId);
                } else if (w.VocabularyId !== undefined && w.VocabularyId !== null) {
                  wordId = Number(w.VocabularyId);
                } else if (w.ID !== undefined && w.ID !== null) {
                  wordId = Number(w.ID);
                }
                
                return {
                  id: wordId,
                  question: w.word || '',
                  answer: w.definition || '',
                  topic: w.category,
                  audioUrl: w.audioUrl,
                  example: w.example
                };
              });
              this.vocabularyList.vocabularyCount = this.vocabularyList.words.length;
              this.currentPage = 1;
            }
          }
        });
      }
    });
  }

  openWordDetail(word: VocabularyItem): void {
    console.log('Opening word detail for:', word);
    console.log('Word ID:', word.id, 'Type:', typeof word.id);
    
    // Đảm bảo ID được set đúng (kiểm tra nhiều trường hợp)
    let wordId: number | null = null;
    
    // Kiểm tra nếu word.id tồn tại
    if (word.id !== undefined && word.id !== null) {
      // Nếu đã là number, sử dụng trực tiếp
      if (typeof word.id === 'number') {
        wordId = word.id;
      } else {
        // Thử convert sang number
        const convertedId = Number(word.id);
        // Kiểm tra nếu conversion thành công (không phải NaN và là số nguyên dương)
        if (!isNaN(convertedId) && convertedId > 0) {
          wordId = convertedId;
        }
      }
    }
    
    // Nếu vẫn không có ID, log để debug
    if (wordId === null || wordId === undefined) {
      console.warn('⚠️ Word ID không tồn tại - Chỉ có thể xem, không thể chỉnh sửa hoặc xóa');
      console.warn('Word object:', word);
      console.warn('Word.id value:', word.id, 'Type:', typeof word.id);
    } else {
      console.log('✅ Word ID found:', wordId);
    }
    
    this.selectedWord = word;
    this.selectedWordId = wordId;
    this.isEditMode = false;
    this.isDetailModalOpen = true;
    
    // Debug: Log selectedWordId để kiểm tra
    console.log('🔍 selectedWordId sau khi set:', this.selectedWordId);
  }

  closeDetailModal(): void {
    this.isDetailModalOpen = false;
    this.selectedWord = null;
    this.selectedWordId = null;
    this.isEditMode = false;
    this.editWordForm.reset();
  }

  openEditMode(): void {
    if (!this.selectedWord || !this.selectedWordId) return;
    
    this.isEditMode = true;
    this.editWordForm.patchValue({
      word: this.selectedWord.question,
      definition: this.selectedWord.answer,
      category: this.selectedWord.topic || '',
      example: this.selectedWord.example || ''
    });
  }

  cancelEdit(): void {
    this.isEditMode = false;
    this.editWordForm.reset();
  }

  saveEditedWord(): void {
    if (this.editWordForm.invalid || this.isSubmitting || !this.selectedWordId) {
      if (this.editWordForm.invalid) {
        Object.keys(this.editWordForm.controls).forEach(key => {
          this.editWordForm.get(key)?.markAsTouched();
        });
      }
      return;
    }

    this.isSubmitting = true;
    const formValue = this.editWordForm.value;

    const updateData = {
      word: formValue.word.trim(),
      typeOfWord: 'Noun', // Giữ nguyên giá trị mặc định
      definition: formValue.definition.trim(),
      category: formValue.category?.trim() || undefined, // Thêm category
      example: formValue.example?.trim() || undefined
    };

    this.vocabularyService.updateVocabulary(this.selectedWordId, updateData).subscribe({
      next: (response) => {
        console.log('Từ vựng đã được cập nhật:', response);
        this.isSubmitting = false;
        this.isEditMode = false;
        
        // Cập nhật local data
        if (this.selectedWord && this.vocabularyList && this.selectedWordId) {
          const wordIndex = this.vocabularyList.words.findIndex(
            w => (w as any).id === this.selectedWordId || w.question === this.selectedWord!.question
          );
          if (wordIndex >= 0) {
            this.vocabularyList.words[wordIndex] = {
              ...this.vocabularyList.words[wordIndex],
              question: formValue.word.trim(),
              answer: formValue.definition.trim(),
              topic: formValue.category?.trim() || undefined,
              example: formValue.example?.trim()
            };
            this.selectedWord = this.vocabularyList.words[wordIndex];
          }
        }
      },
      error: (error) => {
        console.error('Lỗi khi cập nhật từ vựng:', error);
        this.isSubmitting = false;
        const errorMsg = error?.error?.message || 'Không thể cập nhật từ vựng. Vui lòng thử lại.';
        alert(errorMsg);
      }
    });
  }

  deleteWord(): void {
    if (!this.selectedWordId || this.isSubmitting) return;
    
    const confirmDelete = confirm('Bạn có chắc chắn muốn xóa từ vựng này không?');
    if (!confirmDelete) return;

    this.isSubmitting = true;
    this.vocabularyService.deleteVocabulary(this.selectedWordId).subscribe({
      next: () => {
        console.log('Từ vựng đã được xóa');
        this.isSubmitting = false;
        this.closeDetailModal();
        
        // Xóa khỏi local data
        if (this.vocabularyList) {
          this.vocabularyList.words = this.vocabularyList.words.filter(
            w => (w as any).id !== this.selectedWordId
          );
          this.vocabularyList.vocabularyCount = this.vocabularyList.words.length;
          // Reset về trang đầu nếu cần
          if (this.currentPage > this.totalPages && this.totalPages > 0) {
            this.currentPage = this.totalPages;
          }
        }
      },
      error: (error) => {
        console.error('Lỗi khi xóa từ vựng:', error);
        this.isSubmitting = false;
        const errorMsg = error?.error?.message || 'Không thể xóa từ vựng. Vui lòng thử lại.';
        alert(errorMsg);
      }
    });
  }

  goBack(): void {
    if (this.close.observers.length > 0) {
      this.close.emit();
    } else {
      this.router.navigate(['/tu-vung']);
    }
  }
}