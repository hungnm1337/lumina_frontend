import { CommonModule } from '@angular/common';
import { Component, Input, Output, EventEmitter, OnInit } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { FormsModule, ReactiveFormsModule, FormBuilder, FormGroup, Validators } from '@angular/forms';
import { VocabularyService } from '../../../Services/Vocabulary/vocabulary.service';
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
  


  constructor(
    private route: ActivatedRoute,
    private router: Router,
    private vocabularyService: VocabularyService,
    private fb: FormBuilder
  ) {
    // Initialize form - 4 fields: word, definition, category, example
    this.addWordForm = this.fb.group({
      word: ['', [Validators.required, Validators.maxLength(100)]],
      definition: ['', [Validators.required, Validators.maxLength(500)]],
      category: [''], // Category - will map to category in database
      example: [''] // Example
    });
    
    // Edit vocabulary form
    this.editWordForm = this.fb.group({
      word: ['', [Validators.required, Validators.maxLength(100)]],
      definition: ['', [Validators.required, Validators.maxLength(500)]],
      category: [''],
      example: ['']
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
                    example: w.example
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
      example: ''
    });
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

    const vocabularyData = {
      vocabularyListId: listId,
      word: formValue.word.trim(),
      typeOfWord: 'Noun', // Default value because backend requires this field
      definition: formValue.definition.trim(),
      category: formValue.category?.trim() || undefined, // Category - map to category
      example: formValue.example?.trim() || undefined // Example
    };

    this.vocabularyService.createVocabulary(vocabularyData).subscribe({
      next: (response) => {
        console.log('Vocabulary added successfully:', response);
        this.isSubmitting = false;
        this.closeAddWordModal();
        
        // Reload vocabulary list
        this.reloadVocabularyList(listId);
      },
      error: (error) => {
        console.error('Error adding vocabulary:', error);
        this.isSubmitting = false;
        
        let errorMsg = 'Cannot add vocabulary. Please try again.';
        
        if (error.status === 403) {
          errorMsg = error?.error?.message || 'You do not have permission to add words to this list. You can only add to your own list.';
        } else if (error.status === 401) {
          errorMsg = 'Login session has expired. Please login again.';
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
              console.error('Cannot reload vocabulary');
            }
          });
        } else {
          if (this.vocabularyList) {
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
      typeOfWord: 'Noun', // Keep default value
      definition: formValue.definition.trim(),
      category: formValue.category?.trim() || undefined, // Add category
      example: formValue.example?.trim() || undefined
    };

    this.vocabularyService.updateVocabulary(this.selectedWordId, updateData).subscribe({
      next: (response) => {
        console.log('Vocabulary updated:', response);
        this.isSubmitting = false;
        this.isEditMode = false;
        
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
              example: formValue.example?.trim()
            };
            this.selectedWord = this.vocabularyList.words[wordIndex];
          }
        }
      },
      error: (error) => {
        console.error('Error updating vocabulary:', error);
        this.isSubmitting = false;
        const errorMsg = error?.error?.message || 'Cannot update vocabulary. Please try again.';
        alert(errorMsg);
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