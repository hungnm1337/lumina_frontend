import { CommonModule } from '@angular/common';
import { Component, Input, Output, EventEmitter, OnInit } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { FormsModule, ReactiveFormsModule, FormBuilder, FormGroup, Validators } from '@angular/forms';
import { VocabularyService } from '../../../Services/Vocabulary/vocabulary.service';
import { UploadService } from '../../../Services/Upload/upload.service';
import { ToastService } from '../../../Services/Toast/toast.service';
import { HeaderComponent } from '../../Common/header/header.component';


export interface VocabularyItem {
  id?: number; // Vocabulary ID for update/delete
  question: string;
  answer: string;
  topic?: string;
  level?: string;
  audioUrl?: string;
  example?: string; // Example usage of the word
  liked?: boolean; // Add field to mark as favorite
  imageUrl?: string; // URL ảnh từ Cloudinary cho từng vocabulary
  imageError?: boolean; // Flag để track lỗi load ảnh
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
  selectedTopic: string = 'All';
  selectedLevel: string = 'All';
  
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
  
  // Image upload state
  isUploadingImage = false;
  selectedImageFile: File | null = null;
  imagePreview: string | null = null;
  
  // Add word image upload state
  isUploadingImageForAdd = false;
  selectedImageFileForAdd: File | null = null;
  imagePreviewForAdd: string | null = null;
  


  constructor(
    private route: ActivatedRoute,
    private router: Router,
    private vocabularyService: VocabularyService,
    private uploadService: UploadService,
    private toastService: ToastService,
    private fb: FormBuilder
  ) {
    // Initialize form - 5 fields: word, definition, category, example, imageUrl
    this.addWordForm = this.fb.group({
      word: ['', [Validators.required, Validators.maxLength(100)]],
      definition: ['', [Validators.required, Validators.maxLength(500)]],
      category: [''], // Category - will map to category in database
      example: [''], // Example
      imageUrl: [''] // Image URL
    });
    
    // Edit vocabulary form
    this.editWordForm = this.fb.group({
      word: ['', [Validators.required, Validators.maxLength(100)]],
      definition: ['', [Validators.required, Validators.maxLength(500)]],
      category: [''],
      example: [''],
      imageUrl: [''] // Thêm field imageUrl
    });
  }


  ngOnInit(): void {
    // If vocabularyList is passed via @Input, ensure words have ID
    if (this.vocabularyList && this.vocabularyList.words) {
      this.vocabularyList.words = this.vocabularyList.words.map((w: any) => {
        // If already has valid ID, keep it
        if (w.id !== undefined && w.id !== null && !isNaN(Number(w.id))) {
          return w;
        }
        
        // Try multiple ways to get ID from original object
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
        
        // Only set ID if conversion successful
        if (wordId !== undefined && !isNaN(wordId) && wordId > 0) {
          return {
            ...w,
            id: wordId
          };
        }
        
        return w;
      });
    }
    
    // If component is opened via route (not passed @Input), fetch by param :id
    if (!this.vocabularyList) {
      const idParam = this.route.snapshot.paramMap.get('id');
      const listId = idParam ? Number(idParam) : NaN;
      if (!Number.isNaN(listId)) {
        // Try to get public words first for regular users
        this.vocabularyService.getPublicVocabularyByList(listId).subscribe({
          next: (publicWords: any[]) => {
            if (Array.isArray(publicWords) && publicWords.length > 0) {
              this.vocabularyList = {
                vocabularyListId: listId,
                name: 'Vocabulary List',
                vocabularyCount: publicWords.length,
                words: publicWords.map((w: any) => {
                  // Try multiple ways to get ID
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
                    example: w.example,
                    imageUrl: w.imageUrl // Lấy imageUrl từ API response
                  };
                })
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
    // Always load from vocabularies API to ensure ID, also get list name from detail API
    this.vocabularyService.getVocabularyListDetail(listId).subscribe({
      next: (detail: any) => {
        // Load from vocabularies API to ensure ID
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
                
                // Try multiple ways to get ID
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
                  example: w.example,
                  imageUrl: w.imageUrl || undefined // Lấy imageUrl từ API response
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
            // If detail call fails (backend not implemented), still try to get vocabularies by listId
            this.vocabularyService.getVocabularies(listId).subscribe({
              next: (words) => {
                console.log('Loaded vocabularies (fallback):', words);
                this.vocabularyList = {
                  vocabularyListId: listId,
                  name: 'Vocabulary List',
                  vocabularyCount: Array.isArray(words) ? words.length : 0,
                  words: (words || []).map((w: any) => {
                    // Try multiple ways to get ID
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
                      example: w.example,
                      imageUrl: w.imageUrl // Lấy imageUrl từ API response
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
    if (this.selectedTopic !== 'All') {
      result = result.filter(w => w.topic === this.selectedTopic);
    }
    if (this.selectedLevel !== 'All') {
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


  handleImageError(event: Event, vocab: VocabularyItem): void {
    // Mark vocabulary as having image error
    vocab.imageError = true;
    console.warn(`Failed to load image for vocabulary: ${vocab.question}`, event);
  }

  // Update playAudio function to support Text-to-Speech
  playAudio(audioUrl?: string, word?: string) {
    if (audioUrl) {
      // If has audioUrl, play audio from URL
      const audio = new Audio(audioUrl);
      audio.play().catch(err => {
        console.error('Error playing audio:', err);
        // If error, fallback to TTS
        this.speakWord(word);
      });
    } else if (word) {
      // If no audioUrl, use Text-to-Speech
      this.speakWord(word);
    }
  }

  // Text-to-Speech function using Web Speech API
  private speakWord(word?: string) {
    if (!word) return;

    // Check if browser supports Speech Synthesis
    if ('speechSynthesis' in window) {
      // Stop any currently playing audio (if any)
      window.speechSynthesis.cancel();

      const utterance = new SpeechSynthesisUtterance(word);
      utterance.lang = 'en-US'; // English pronunciation
      utterance.rate = 0.9; // Speech rate (0.1 - 10)
      utterance.pitch = 1; // Pitch (0 - 2)

      window.speechSynthesis.speak(utterance);
    } else {
      console.warn('Browser does not support Text-to-Speech');
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
      alert('Vocabulary list not found');
      return;
    }
    
    // Check if list belongs to current user
    // Get information from API to confirm ownership
    this.vocabularyService.getVocabularyListDetail(listId).subscribe({
      next: (detail: any) => {
        // If has detail, allow opening modal
    this.addWordForm.reset({
      word: '',
      definition: '',
      category: '',
      example: '',
      imageUrl: ''
    });
    this.selectedImageFileForAdd = null;
    this.imagePreviewForAdd = null;
        this.isAddWordModalOpen = true;
      },
      error: (error) => {
        // If no permission, show message
        if (error.status === 403 || error.status === 404) {
          alert('You can only add words to your own list.');
        } else {
          alert('Cannot open add word form. Please try again.');
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
      alert('Vocabulary list not found');
      return;
    }

    this.isSubmitting = true;
    const formValue = this.addWordForm.value;

    // Nếu có file ảnh mới được chọn, upload lên Cloudinary trước
    if (this.selectedImageFileForAdd) {
      this.isUploadingImageForAdd = true;
      this.toastService.info('Hệ thống đang lưu lại từ vựng...');
      
      console.log('📤 Uploading image file:', this.selectedImageFileForAdd.name, 'Size:', this.selectedImageFileForAdd.size);
      
      this.uploadService.uploadFile(this.selectedImageFileForAdd).subscribe({
        next: (response) => {
          console.log('📥 Upload response:', response);
          if (response && response.url) {
            console.log('✅ Image uploaded successfully, URL:', response.url);
            // Sau khi upload thành công, tiếp tục tạo vocabulary với imageUrl mới
            this.createVocabularyWithImageUrl(listId, formValue, response.url);
          } else {
            console.error('❌ Upload response missing URL:', response);
            this.toastService.error('Upload ảnh thất bại: Không nhận được URL');
            this.isUploadingImageForAdd = false;
            this.isSubmitting = false;
          }
        },
        error: (error) => {
          console.error('❌ Error uploading image:', error);
          this.toastService.error('Upload ảnh thất bại. Vui lòng thử lại.');
          this.isUploadingImageForAdd = false;
          this.isSubmitting = false;
        }
      });
    } else {
      console.log('ℹ️ No image file selected, creating vocabulary without image');
      // Không có file mới, tạo vocabulary với imageUrl hiện tại (nếu có)
      this.createVocabularyWithImageUrl(listId, formValue, formValue.imageUrl?.trim() || undefined);
    }
  }

  private createVocabularyWithImageUrl(listId: number, formValue: any, imageUrl: string | undefined): void {
    const vocabularyData: any = {
      vocabularyListId: listId,
      word: formValue.word.trim(),
      typeOfWord: 'Noun', // Default value because backend requires this field
      definition: formValue.definition.trim(),
      category: formValue.category?.trim() || undefined, // Category - map to category
      example: formValue.example?.trim() || undefined // Example
    };
    
    // Chỉ thêm imageUrl vào request nếu có giá trị
    if (imageUrl !== undefined && imageUrl !== null && imageUrl !== '') {
      vocabularyData.imageUrl = imageUrl;
      console.log('✅ Adding imageUrl to request:', imageUrl);
    } else {
      console.warn('⚠️ No imageUrl provided or imageUrl is empty');
    }
    
    console.log('📤 Sending vocabulary data to backend:', JSON.stringify(vocabularyData, null, 2));

    this.vocabularyService.createVocabulary(vocabularyData).subscribe({
      next: (response) => {
        console.log('Vocabulary added successfully:', response);
        console.log('ImageUrl sent to backend:', imageUrl);
        this.isSubmitting = false;
        this.isUploadingImageForAdd = false;
        this.selectedImageFileForAdd = null; // Reset selected file
        this.imagePreviewForAdd = null; // Reset preview
        this.closeAddWordModal();
        
        // Delay nhỏ để đảm bảo database đã cập nhật xong
        setTimeout(() => {
          // Reload vocabulary list với force refresh
          this.reloadVocabularyList(listId);
        }, 500);
        
        this.toastService.success('Thêm từ vựng thành công!');
      },
      error: (error) => {
        console.error('Error adding vocabulary:', error);
        this.isSubmitting = false;
        this.isUploadingImageForAdd = false;
        
        let errorMsg = 'Cannot add vocabulary. Please try again.';
        
        if (error.status === 403) {
          errorMsg = error?.error?.message || 'You do not have permission to add words to this list. You can only add to your own list.';
        } else if (error.status === 401) {
          errorMsg = 'Login session has expired. Please login again.';
        } else if (error.error?.message) {
          errorMsg = error.error.message;
        }
        
        this.toastService.error(errorMsg);
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
              console.log('🔄 Reloading vocabularies from API:', words);
              console.log('🖼️ Checking imageUrl in response:', words?.map((w: any) => ({ word: w.word, imageUrl: w.imageUrl })));
              if (this.vocabularyList) {
                this.vocabularyList.words = (words || []).map((w: any) => {
                  // Try multiple ways to get ID
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
                    question: w.word || '',
                    answer: w.definition || '',
                    topic: w.category,
                    level: undefined,
                    audioUrl: w.audioUrl,
                    example: w.example,
                    imageUrl: w.imageUrl || undefined, // Lấy imageUrl từ API response
                    imageError: false // Reset image error flag
                  };
                  
                  console.log('📝 Mapped word:', mapped.question, 'ImageUrl:', mapped.imageUrl, 'Raw w.imageUrl:', w.imageUrl);
                  return mapped;
                });
                this.vocabularyList.vocabularyCount = this.vocabularyList.words.length;
                // Reset to first page
                this.currentPage = 1;
                console.log('✅ Reloaded vocabulary list with', this.vocabularyList.words.length, 'words');
              }
            },
            error: () => {
              console.error('Cannot reload vocabulary');
            }
          });
        } else {
          if (this.vocabularyList) {
            console.log('🔄 Reloading from detail.words:', detail.words);
            console.log('🖼️ Checking imageUrl in detail.words:', detail.words?.map((w: any) => ({ word: w.word || w.question, imageUrl: w.imageUrl })));
            // Map again to ensure ID
            this.vocabularyList.words = (detail.words || []).map((w: any) => {
              // Try multiple ways to get ID
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
                imageUrl: w.imageUrl || undefined, // Lấy imageUrl từ API response
                topic: w.category || w.topic,
                level: w.level,
                audioUrl: w.audioUrl,
                example: w.example,
                imageError: false // Reset image error flag
              };
              
              console.log('📝 Mapped word from detail:', mapped.question, 'ImageUrl:', mapped.imageUrl, 'Raw w.imageUrl:', w.imageUrl);
              return mapped;
            });
            this.vocabularyList.vocabularyCount = this.vocabularyList.words.length;
            this.currentPage = 1;
            console.log('✅ Reloaded vocabulary list from detail with', this.vocabularyList.words.length, 'words');
          }
        }
      },
      error: () => {
        // Fallback: load vocabularies by listId
        this.vocabularyService.getVocabularies(listId).subscribe({
          next: (words) => {
            console.log('🔄 Fallback: Reloading vocabularies from API:', words);
            if (this.vocabularyList) {
              this.vocabularyList.words = (words || []).map((w: any) => {
                // Try multiple ways to get ID
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
                  question: w.word || '',
                  answer: w.definition || '',
                  topic: w.category,
                  audioUrl: w.audioUrl,
                  example: w.example,
                  imageUrl: w.imageUrl || undefined, // Lấy imageUrl từ API response
                  imageError: false // Reset image error flag
                };
                
                console.log('📝 Fallback mapped word:', mapped.question, 'ImageUrl:', mapped.imageUrl);
                return mapped;
              });
              this.vocabularyList.vocabularyCount = this.vocabularyList.words.length;
              this.currentPage = 1;
              console.log('✅ Fallback: Reloaded vocabulary list with', this.vocabularyList.words.length, 'words');
            }
          },
          error: () => {
            console.error('Cannot reload vocabulary');
          }
        });
      }
    });
  }

  openWordDetail(word: VocabularyItem): void {
    console.log('Opening word detail for:', word);
    console.log('Word ID:', word.id, 'Type:', typeof word.id);
    
    // Ensure ID is set correctly (check multiple cases)
    let wordId: number | null = null;
    
    // Check if word.id exists
    if (word.id !== undefined && word.id !== null) {
      // If already a number, use directly
      if (typeof word.id === 'number') {
        wordId = word.id;
      } else {
        // Try to convert to number
        const convertedId = Number(word.id);
        // Check if conversion successful (not NaN and is positive integer)
        if (!isNaN(convertedId) && convertedId > 0) {
          wordId = convertedId;
        }
      }
    }
    
    // If still no ID, log for debug
    if (wordId === null || wordId === undefined) {
      console.warn('⚠️ Word ID does not exist - Can only view, cannot edit or delete');
      console.warn('Word object:', word);
      console.warn('Word.id value:', word.id, 'Type:', typeof word.id);
    } else {
      console.log('✅ Word ID found:', wordId);
    }
    
    this.selectedWord = word;
    this.selectedWordId = wordId;
    this.isEditMode = false;
    this.isDetailModalOpen = true;
    
    // Debug: Log selectedWordId to check
    console.log('🔍 selectedWordId after setting:', this.selectedWordId);
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
      example: this.selectedWord.example || '',
      imageUrl: this.selectedWord.imageUrl || ''
    });
    
    // Reset image upload state
    this.selectedImageFile = null;
    this.imagePreview = this.selectedWord.imageUrl || null;
  }

  cancelEdit(): void {
    this.isEditMode = false;
    this.editWordForm.reset();
    this.selectedImageFile = null;
    this.imagePreview = null;
  }
  
  onImageSelected(event: Event): void {
    const input = event.target as HTMLInputElement;
    if (input.files && input.files.length > 0) {
      const file = input.files[0];
      
      // Validate file type
      if (!file.type.startsWith('image/')) {
        this.toastService.error('Vui lòng chọn file ảnh hợp lệ!');
        return;
      }
      
      // Validate file size (max 5MB)
      if (file.size > 5 * 1024 * 1024) {
        this.toastService.error('Kích thước ảnh không được vượt quá 5MB!');
        return;
      }
      
      this.selectedImageFile = file;
      
      // Create preview
      const reader = new FileReader();
      reader.onload = (e) => {
        this.imagePreview = e.target?.result as string;
      };
      reader.readAsDataURL(file);
    }
  }
  
  removeImage(): void {
    this.selectedImageFile = null;
    this.imagePreview = null;
    this.editWordForm.patchValue({ imageUrl: '' });
  }
  
  onImageSelectedForAdd(event: Event): void {
    const input = event.target as HTMLInputElement;
    if (input.files && input.files.length > 0) {
      const file = input.files[0];
      
      // Validate file type
      if (!file.type.startsWith('image/')) {
        this.toastService.error('Vui lòng chọn file ảnh hợp lệ!');
        return;
      }
      
      // Validate file size (max 5MB)
      if (file.size > 5 * 1024 * 1024) {
        this.toastService.error('Kích thước ảnh không được vượt quá 5MB!');
        return;
      }
      
      this.selectedImageFileForAdd = file;
      
      // Create preview
      const reader = new FileReader();
      reader.onload = (e) => {
        this.imagePreviewForAdd = e.target?.result as string;
      };
      reader.readAsDataURL(file);
    }
  }
  
  removeImageForAdd(): void {
    this.selectedImageFileForAdd = null;
    this.imagePreviewForAdd = null;
    this.addWordForm.patchValue({ imageUrl: '' });
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

    // Nếu có file ảnh mới được chọn, upload lên Cloudinary trước
    if (this.selectedImageFile) {
      this.isUploadingImage = true;
      this.toastService.info('Hệ thống đang lưu lại từ vựng...');
      
      this.uploadService.uploadFile(this.selectedImageFile).subscribe({
        next: (response) => {
          if (response && response.url) {
            // Sau khi upload thành công, tiếp tục update vocabulary với imageUrl mới
            this.updateVocabularyWithImageUrl(formValue, response.url);
          } else {
            this.toastService.error('Upload ảnh thất bại: Không nhận được URL');
            this.isUploadingImage = false;
            this.isSubmitting = false;
          }
        },
        error: (error) => {
          console.error('Error uploading image:', error);
          this.toastService.error('Upload ảnh thất bại. Vui lòng thử lại.');
          this.isUploadingImage = false;
          this.isSubmitting = false;
        }
      });
    } else {
      // Không có file mới, kiểm tra xem user có muốn xóa ảnh không
      // Nếu imageUrl trong form là empty string → user đã xóa ảnh → gửi null
      // Nếu imageUrl trong form có giá trị → giữ nguyên → gửi giá trị đó
      // Nếu imageUrl trong form là undefined → không thay đổi → không gửi field này
      const currentImageUrl = formValue.imageUrl?.trim();
      const imageUrlToSend = currentImageUrl === '' ? null : (currentImageUrl || undefined);
      this.updateVocabularyWithImageUrl(formValue, imageUrlToSend);
    }
  }

  private updateVocabularyWithImageUrl(formValue: any, imageUrl: string | undefined): void {
    const updateData: any = {
      word: formValue.word.trim(),
      typeOfWord: 'Noun', // Keep default value
      definition: formValue.definition.trim(),
      category: formValue.category?.trim() || undefined,
      example: formValue.example?.trim() || undefined
    };
    
    // Chỉ thêm imageUrl vào request nếu có giá trị (không phải undefined)
    // Nếu undefined, không gửi field này để backend giữ nguyên giá trị cũ
    if (imageUrl !== undefined) {
      updateData.imageUrl = imageUrl || null; // Nếu empty string, gửi null để xóa ảnh
    }
    
    console.log('📤 Sending update request:', updateData);
    console.log('📤 ImageUrl value:', imageUrl);

    this.vocabularyService.updateVocabulary(this.selectedWordId!, updateData).subscribe({
      next: (response) => {
        console.log('Vocabulary updated:', response);
        this.isSubmitting = false;
        this.isUploadingImage = false;
        this.isEditMode = false;
        this.selectedImageFile = null; // Reset selected file
        
        // Update local data
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
              example: formValue.example?.trim(),
              imageUrl: imageUrl
            };
            this.selectedWord = this.vocabularyList.words[wordIndex];
            this.imagePreview = imageUrl || null; // Update preview với URL mới
          }
        }
        
        this.toastService.success('Cập nhật từ vựng thành công!');
      },
      error: (error) => {
        console.error('Error updating vocabulary:', error);
        this.isSubmitting = false;
        this.isUploadingImage = false;
        const errorMsg = error?.error?.message || 'Cannot update vocabulary. Please try again.';
        this.toastService.error(errorMsg);
      }
    });
  }

  deleteWord(): void {
    if (!this.selectedWordId || this.isSubmitting) return;
    
    const confirmDelete = confirm('Are you sure you want to delete this vocabulary?');
    if (!confirmDelete) return;

    this.isSubmitting = true;
    this.vocabularyService.deleteVocabulary(this.selectedWordId).subscribe({
      next: () => {
        console.log('Vocabulary deleted');
        this.isSubmitting = false;
        this.closeDetailModal();
        
        // Remove from local data
        if (this.vocabularyList) {
          this.vocabularyList.words = this.vocabularyList.words.filter(
            w => (w as any).id !== this.selectedWordId
          );
          this.vocabularyList.vocabularyCount = this.vocabularyList.words.length;
          // Reset to first page if needed
          if (this.currentPage > this.totalPages && this.totalPages > 0) {
            this.currentPage = this.totalPages;
          }
        }
      },
      error: (error) => {
        console.error('Error deleting vocabulary:', error);
        this.isSubmitting = false;
        const errorMsg = error?.error?.message || 'Cannot delete vocabulary. Please try again.';
        alert(errorMsg);
      }
    });
  }

  goBack(): void {
    if (this.close.observers.length > 0) {
      this.close.emit();
    } else {
      this.router.navigate(['/vocabulary']);
    }
  }
}