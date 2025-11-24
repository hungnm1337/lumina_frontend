import { Component, OnInit, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router, RouterModule } from '@angular/router';
import { HeaderComponent } from '../../Views/Common/header/header.component';
import { SpacedRepetitionService, SpacedRepetition } from '../../Services/spaced-repetition/spaced-repetition.service';
import { VocabularyService } from '../../Services/Vocabulary/vocabulary.service';
import { VocabularyWord } from '../../Interfaces/vocabulary.interfaces';
import { forkJoin } from 'rxjs';

@Component({
  selector: 'app-spaced-repetition-dashboard',
  standalone: true,
  imports: [CommonModule, RouterModule, HeaderComponent],
  templateUrl: './spaced-repetition-dashboard.component.html',
  styleUrls: ['./spaced-repetition-dashboard.component.scss']
})
export class SpacedRepetitionDashboardComponent implements OnInit {
  // Statistics
  spacedRepetitionStats: {
    dueToday: number;
    mastered: number;
    upcoming: number; // Số từ cần học sắp tới (từ ngày mai trở đi)
  } | null = null;

  // Lists
  dueTodayLists: SpacedRepetition[] = [];
  public dueTodayWords: VocabularyWithReview[] = []; // Word-level vocabulary that needs review today
  public missedWords: VocabularyWithReview[] = []; // Words that were missed (not studied when due)
  upcomingLists: SpacedRepetition[] = [];
  allRepetitions: SpacedRepetition[] = [];

  // New: Separated lists
  unlearnedFolders: SpacedRepetition[] = []; // Chưa học
  learnedFoldersByDate: { date: string; label: string; folders: SpacedRepetition[] }[] = []; // Đã học, nhóm theo ngày
  learnedVocabulariesByDate: { date: string; label: string; vocabularies: VocabularyWithReview[]; currentPage: number; pageSize: number }[] = []; // Vocabularies đã học, nhóm theo ngày

  // Vocabulary with review info
  upcomingVocabularies: VocabularyWithReview[] = [];
  
  // Pagination for upcoming vocabularies
  currentUpcomingPage = 1;
  upcomingPageSize = 9;

  // Loading states
  isLoadingStats = false;
  isLoadingDue = false;
  isLoadingUpcoming = false;

  // Filter
  filterStatus: 'all' | 'due' | 'learning' | 'mastered' = 'all';

  constructor(
    private spacedRepetitionService: SpacedRepetitionService,
    private vocabularyService: VocabularyService,
    private router: Router,
    private cdr: ChangeDetectorRef
  ) { }

  ngOnInit(): void {
    this.loadAllData();
  }

  loadAllData(): void {
    this.loadStatistics();
    this.loadDueToday();
    this.loadUpcoming();
    this.loadMissedWords();
  }

  loadStatistics(): void {
    this.isLoadingStats = true;
    
    // Sử dụng getDueForReview() để đảm bảo logic nhất quán với backend
    // và loadStatistics() để tính thống kê chính xác
    forkJoin({
      allRepetitions: this.spacedRepetitionService.getAllRepetitions(),
      dueForReview: this.spacedRepetitionService.getDueForReview()
    }).subscribe({
      next: ({ allRepetitions, dueForReview }) => {
        // Tính toán ngày tháng
        const now = new Date();
        const today = new Date(now);
        today.setHours(0, 0, 0, 0);
        const tomorrow = new Date(today);
        tomorrow.setDate(tomorrow.getDate() + 1);
        
        // CHỈ XỬ LÝ NHỮNG TỪ ĐÃ ĐƯỢC ĐÁNH GIÁ
        const reviewedRepetitions = allRepetitions.filter(r => 
          (r.vocabularyId !== null && r.vocabularyId !== undefined) || // Word-level records
          (r.reviewCount > 0 || r.bestQuizScore !== undefined || r.lastQuizScore !== undefined) // Folder-level với progress
        );
        
        // 1. Tính "Cần review hôm nay": sử dụng kết quả từ getDueForReview() để đảm bảo nhất quán
        // Backend đã filter: NextReviewAt <= now, Intervals == 1 || null, ReviewCount > 0, Status New/Learning
        const dueTodayWordLevel = dueForReview.filter(r => r.vocabularyId !== null && r.vocabularyId !== undefined);
        
        // Loại bỏ các từ đã được review hôm nay và làm đúng (intervals > 1)
        // Vì những từ đó đã được tính vào "Đã thuộc"
        const dueToday = dueTodayWordLevel.filter(r => {
          if (!r.lastReviewedAt) return true; // Chưa review thì vẫn cần review
          
          const lastReviewedDate = new Date(r.lastReviewedAt);
          lastReviewedDate.setHours(0, 0, 0, 0);
          
          // Nếu đã review hôm nay và làm đúng (intervals > 1) thì không tính vào "Cần review"
          if (lastReviewedDate.getTime() === today.getTime() && r.intervals > 1) {
            return false;
          }
          
          return true;
        });

        // 2. Tính "Đã thuộc": các từ vựng đã làm quiz đúng từ phần "Cần review hôm nay"
        // Điều kiện: word-level, được review hôm nay, và intervals > 1 (làm đúng)
        const mastered = reviewedRepetitions.filter(r => {
          if (!r.vocabularyId || r.vocabularyId === null || r.vocabularyId === undefined) return false;
          if (!r.lastReviewedAt) return false;
          
          const reviewedDate = new Date(r.lastReviewedAt);
          reviewedDate.setHours(0, 0, 0, 0);
          const isReviewedToday = reviewedDate.getTime() === today.getTime();
          const hasCorrectAnswer = r.intervals > 1;
          
          return isReviewedToday && hasCorrectAnswer;
        });
        
        // 3. Tính "Cần học sắp tới": các từ vựng có nextReviewAt từ ngày mai trở đi
        // KHÔNG TÍNH CÁC TỪ CẦN REVIEW HÔM NAY
        const upcoming = reviewedRepetitions.filter(r => {
          if (!r.vocabularyId || r.vocabularyId === null || r.vocabularyId === undefined) return false;
          if (!r.nextReviewAt) return false;
          
          const reviewDate = new Date(r.nextReviewAt);
          reviewDate.setHours(0, 0, 0, 0);
          
          // nextReviewAt phải từ ngày mai trở đi (KHÔNG bao gồm hôm nay)
          const isUpcoming = reviewDate >= tomorrow;
          
          // Chỉ tính những từ đang trong quá trình học (New hoặc Learning)
          const isActive = r.status === 'New' || r.status === 'Learning';
          
          return isUpcoming && isActive;
        });
        
        this.spacedRepetitionStats = {
          dueToday: dueToday.length,
          mastered: mastered.length,
          upcoming: upcoming.length
        };

        // Lưu những từ đã đánh giá
        this.allRepetitions = reviewedRepetitions;
        this.organizeFolders(reviewedRepetitions);
        this.isLoadingStats = false;
      },
      error: (error) => {
        console.error('Error loading statistics:', error);
        this.isLoadingStats = false;
      }
    });
  }

  loadDueToday(): void {
    this.isLoadingDue = true;
    
    this.spacedRepetitionService.getDueForReview().subscribe({
      next: (repetitions) => {
        // Separate folder-level and word-level
        this.dueTodayLists = repetitions.filter(r => !r.vocabularyId || r.vocabularyId === null);
        
        // Get word-level vocabulary that needs review today
        const wordLevelRepetitions = repetitions.filter(r => r.vocabularyId !== null && r.vocabularyId !== undefined);
        
        // Loại bỏ các từ đã được review hôm nay và làm đúng (intervals > 1)
        // Vì những từ đó đã được tính vào "Đã thuộc"
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        
        const filteredWordLevelRepetitions = wordLevelRepetitions.filter(r => {
          if (!r.lastReviewedAt) return true; // Chưa review thì vẫn cần review
          
          const lastReviewedDate = new Date(r.lastReviewedAt);
          lastReviewedDate.setHours(0, 0, 0, 0);
          
          // Nếu đã review hôm nay và làm đúng (intervals > 1) thì không hiển thị
          if (lastReviewedDate.getTime() === today.getTime() && r.intervals > 1) {
            return false;
          }
          
          return true;
        });
        
        if (filteredWordLevelRepetitions.length > 0) {
          // Load actual vocabulary words
          const uniqueListIds = new Set<number>();
          filteredWordLevelRepetitions.forEach(rep => {
            if (rep.vocabularyListId) {
              uniqueListIds.add(rep.vocabularyListId);
            }
          });

          const vocabularyRequests = Array.from(uniqueListIds).map(listId => 
            this.vocabularyService.getVocabularies(listId)
          );

          forkJoin(vocabularyRequests).subscribe({
            next: (vocabulariesArrays) => {
              const dueWordsMap = new Map<number, VocabularyWithReview>();
              
              Array.from(uniqueListIds).forEach((listId, index) => {
                const vocabularies = vocabulariesArrays[index] || [];
                
                vocabularies.forEach(vocab => {
                  const vocabId = vocab.id;
                  if (vocabId) {
                    const reviewRecord = filteredWordLevelRepetitions.find(r => r.vocabularyId === vocabId);
                    if (reviewRecord) {
                      dueWordsMap.set(vocabId, {
                        vocabulary: vocab,
                        reviewInfo: {
                          vocabularyListId: reviewRecord.vocabularyListId,
                          vocabularyListName: reviewRecord.vocabularyListName,
                          nextReviewAt: reviewRecord.nextReviewAt,
                          reviewCount: reviewRecord.reviewCount,
                          status: reviewRecord.status,
                          bestQuizScore: reviewRecord.bestQuizScore,
                          lastQuizScore: reviewRecord.lastQuizScore,
                          totalQuizAttempts: reviewRecord.totalQuizAttempts,
                          intervals: reviewRecord.intervals
                        }
                      });
                    }
                  }
                });
              });

              this.dueTodayWords = Array.from(dueWordsMap.values());
              this.isLoadingDue = false;
            },
            error: (error) => {
              console.error('Error loading vocabularies:', error);
              this.isLoadingDue = false;
            }
          });
        } else {
          this.dueTodayWords = [];
          this.isLoadingDue = false;
        }
      },
      error: (error) => {
        console.error('Error loading due today:', error);
        this.isLoadingDue = false;
      }
    });
  }

  loadUpcoming(): void {
    this.isLoadingUpcoming = true;
    
    this.spacedRepetitionService.getAllRepetitions().subscribe({
      next: (repetitions) => {
        const now = new Date();
        now.setHours(0, 0, 0, 0);
        const tomorrow = new Date(now);
        tomorrow.setDate(tomorrow.getDate() + 1);
        const dayAfterTomorrow = new Date(tomorrow);
        dayAfterTomorrow.setDate(dayAfterTomorrow.getDate() + 1);
        
        // CHỈ XỬ LÝ NHỮNG TỪ ĐÃ ĐƯỢC ĐÁNH GIÁ
        // - Có VocabularyId != null: đã đánh giá từng word (spaced repetition)
        // - Có reviewCount > 0 hoặc quiz scores: đã đánh giá folder level
        const reviewedRepetitions = repetitions.filter(r => 
          (r.vocabularyId !== null && r.vocabularyId !== undefined) || // Word-level records
          (r.reviewCount > 0 || r.bestQuizScore !== undefined || r.lastQuizScore !== undefined) // Folder-level với progress
        );
        
        // Lọc những từ sẽ review NGÀY MAI (chỉ lấy word-level records)
        const tomorrowVocabularies = reviewedRepetitions
          .filter(r => {
            if (!r.nextReviewAt || !r.vocabularyId) return false; // Chỉ lấy word-level
            const reviewDate = new Date(r.nextReviewAt);
            reviewDate.setHours(0, 0, 0, 0);
            
            // Review date phải là ngày mai (giữa tomorrow và dayAfterTomorrow)
            const isTomorrow = reviewDate >= tomorrow && reviewDate < dayAfterTomorrow;
            const isActive = (r.status === 'New' || r.status === 'Learning');
            
            return isTomorrow && isActive;
          })
          .sort((a, b) => {
            if (!a.nextReviewAt || !b.nextReviewAt) return 0;
            return new Date(a.nextReviewAt).getTime() - new Date(b.nextReviewAt).getTime();
          });

        // Tạo map từ allRepetitions để tìm những từ đã được đánh giá (có VocabularyId)
        const reviewedVocabMap = new Map<number, SpacedRepetition>();
        tomorrowVocabularies.forEach(rep => {
          if (rep.vocabularyId !== null && rep.vocabularyId !== undefined) {
            reviewedVocabMap.set(rep.vocabularyId, rep);
          }
        });

        // Load vocabularies từ các folder có từ cần review ngày mai
        const uniqueListIds = new Set<number>();
        tomorrowVocabularies.forEach(rep => {
          if (rep.vocabularyListId) {
            uniqueListIds.add(rep.vocabularyListId);
          }
        });

        if (uniqueListIds.size === 0) {
          this.upcomingVocabularies = [];
          this.isLoadingUpcoming = false;
          return;
        }

        // Load vocabularies từ các list
        const vocabularyRequests = Array.from(uniqueListIds).map(listId => 
          this.vocabularyService.getVocabularies(listId)
        );

        forkJoin(vocabularyRequests).subscribe({
          next: (vocabulariesArrays) => {
            const uniqueVocabulariesMap = new Map<number | string, VocabularyWithReview>();
            
            Array.from(uniqueListIds).forEach((listId, index) => {
              const vocabularies = vocabulariesArrays[index] || [];
              
              // CHỈ HIỂN THỊ NHỮNG TỪ ĐÃ ĐƯỢC ĐÁNH GIÁ VÀ CẦN REVIEW NGÀY MAI
              vocabularies.forEach(vocab => {
                const vocabId: number | string = vocab.id || vocab.word?.toLowerCase() || '';
                const vocabIdNum = typeof vocabId === 'number' ? vocabId : null;
                
                // Chỉ thêm nếu từ này đã được đánh giá và cần review ngày mai
                if (vocabIdNum && reviewedVocabMap.has(vocabIdNum)) {
                  const reviewRecord = reviewedVocabMap.get(vocabIdNum)!;
                  
                  if (!uniqueVocabulariesMap.has(vocabId)) {
                    uniqueVocabulariesMap.set(vocabId, {
                      vocabulary: vocab,
                      reviewInfo: {
                        vocabularyListId: reviewRecord.vocabularyListId,
                        vocabularyListName: reviewRecord.vocabularyListName,
                        nextReviewAt: reviewRecord.nextReviewAt,
                        reviewCount: reviewRecord.reviewCount,
                        status: reviewRecord.status,
                        bestQuizScore: reviewRecord.bestQuizScore,
                        lastQuizScore: reviewRecord.lastQuizScore,
                        totalQuizAttempts: reviewRecord.totalQuizAttempts,
                        intervals: reviewRecord.intervals
                      }
                    });
                  }
                }
              });
            });

            // Chuyển Map thành Array
            this.upcomingVocabularies = Array.from(uniqueVocabulariesMap.values());

            // Sắp xếp theo nextReviewAt
            this.upcomingVocabularies.sort((a, b) => {
              if (!a.reviewInfo.nextReviewAt || !b.reviewInfo.nextReviewAt) return 0;
              return new Date(a.reviewInfo.nextReviewAt).getTime() - new Date(b.reviewInfo.nextReviewAt).getTime();
            });

            // Reset về trang 1 khi load lại data
            this.currentUpcomingPage = 1;

            this.isLoadingUpcoming = false;
            this.cdr.detectChanges();
          },
          error: (error) => {
            console.error('Error loading vocabularies:', error);
            this.isLoadingUpcoming = false;
          }
        });
      },
      error: (error) => {
        console.error('Error loading upcoming:', error);
        this.isLoadingUpcoming = false;
      }
    });
  }

  loadVocabulariesFromFolders(folders: SpacedRepetition[]): void {
    if (folders.length === 0) {
      this.isLoadingUpcoming = false;
      return;
    }

    // Loại bỏ duplicate folders (theo vocabularyListId) trước khi load
    const uniqueFoldersMap = new Map<number, SpacedRepetition>();
    folders.forEach(folder => {
      if (!uniqueFoldersMap.has(folder.vocabularyListId)) {
        uniqueFoldersMap.set(folder.vocabularyListId, folder);
      }
    });
    const uniqueFolders = Array.from(uniqueFoldersMap.values());

    // Tạo các requests để load vocabularies từ mỗi folder (chỉ load 1 lần cho mỗi folder)
    const vocabularyRequests = uniqueFolders.map(folder => 
      this.vocabularyService.getVocabularies(folder.vocabularyListId)
    );

    forkJoin(vocabularyRequests).subscribe({
      next: (vocabulariesArrays) => {
        // Map để loại bỏ duplicate vocabularies theo vocabularyId
        const uniqueVocabulariesMap = new Map<number | string, VocabularyWithReview>();
        
        // Tạo map từ allRepetitions để tìm những từ đã được đánh giá (có VocabularyId)
        const reviewedVocabMap = new Map<number, SpacedRepetition>();
        this.allRepetitions.forEach(rep => {
          if (rep.vocabularyId !== null && rep.vocabularyId !== undefined) {
            reviewedVocabMap.set(rep.vocabularyId, rep);
          }
        });
        
        uniqueFolders.forEach((folder, index) => {
          const vocabularies = vocabulariesArrays[index] || [];
          
          // CHỈ HIỂN THỊ NHỮNG TỪ ĐÃ ĐƯỢC ĐÁNH GIÁ (có record trong reviewedVocabMap)
          vocabularies.forEach(vocab => {
            // Lấy ID từ vocabulary (fallback về word nếu không có ID)
            const vocabId: number | string = vocab.id || vocab.word?.toLowerCase() || '';
            const vocabIdNum = typeof vocabId === 'number' ? vocabId : null;
            
            // Chỉ thêm nếu từ này đã được đánh giá (có record với VocabularyId)
            if (vocabIdNum && reviewedVocabMap.has(vocabIdNum)) {
              const reviewRecord = reviewedVocabMap.get(vocabIdNum)!;
              
              if (!uniqueVocabulariesMap.has(vocabId)) {
                uniqueVocabulariesMap.set(vocabId, {
                  vocabulary: vocab,
                  reviewInfo: {
                    vocabularyListId: reviewRecord.vocabularyListId,
                    vocabularyListName: reviewRecord.vocabularyListName,
                    nextReviewAt: reviewRecord.nextReviewAt,
                    reviewCount: reviewRecord.reviewCount,
                    status: reviewRecord.status,
                    bestQuizScore: reviewRecord.bestQuizScore,
                    lastQuizScore: reviewRecord.lastQuizScore,
                    totalQuizAttempts: reviewRecord.totalQuizAttempts,
                    intervals: reviewRecord.intervals
                  }
                });
              } else {
                // Nếu đã có, so sánh nextReviewAt và giữ bản ghi có nextReviewAt sớm hơn
                const existing = uniqueVocabulariesMap.get(vocabId)!;
                if (reviewRecord.nextReviewAt && existing.reviewInfo.nextReviewAt) {
                  const existingDate = new Date(existing.reviewInfo.nextReviewAt);
                  const currentDate = new Date(reviewRecord.nextReviewAt);
                  if (currentDate < existingDate) {
                    uniqueVocabulariesMap.set(vocabId, {
                      vocabulary: vocab,
                      reviewInfo: {
                        vocabularyListId: reviewRecord.vocabularyListId,
                        vocabularyListName: reviewRecord.vocabularyListName,
                        nextReviewAt: reviewRecord.nextReviewAt,
                        reviewCount: reviewRecord.reviewCount,
                        status: reviewRecord.status,
                        bestQuizScore: reviewRecord.bestQuizScore,
                        lastQuizScore: reviewRecord.lastQuizScore,
                        totalQuizAttempts: reviewRecord.totalQuizAttempts,
                        intervals: reviewRecord.intervals
                      }
                    });
                  }
                }
              }
            }
          });
        });

        // Chuyển Map thành Array
        this.upcomingVocabularies = Array.from(uniqueVocabulariesMap.values());

        // Sắp xếp theo nextReviewAt
        this.upcomingVocabularies.sort((a, b) => {
          if (!a.reviewInfo.nextReviewAt || !b.reviewInfo.nextReviewAt) return 0;
          return new Date(a.reviewInfo.nextReviewAt).getTime() - new Date(b.reviewInfo.nextReviewAt).getTime();
        });

        // Reset về trang 1 khi load lại data
        this.currentUpcomingPage = 1;

        this.isLoadingUpcoming = false;
      },
      error: (error) => {
        console.error('Error loading vocabularies:', error);
        this.isLoadingUpcoming = false;
      }
    });
  }

  // Navigate to deck detail để review
  goToDeck(listId: number): void {
    this.router.navigate(['/flashcards', listId]);
  }

  // Start reviewing all due vocabulary
  startDueReviews(): void {
    if (this.dueTodayLists && this.dueTodayLists.length > 0) {
      // Navigate to first due vocabulary list
      this.router.navigate(['/flashcards', this.dueTodayLists[0].vocabularyListId]);
    }
  }

  // Start review quiz for due today words
  public startReviewQuiz(): void {
    if (this.dueTodayWords && this.dueTodayWords.length > 0) {
      // Navigate to review quiz with due words
      this.router.navigate(['/spaced-repetition/review-quiz'], {
        queryParams: {
          words: this.dueTodayWords.map(w => w.vocabulary.id).filter(id => id !== undefined).join(',')
        }
      });
    }
  }

  // Load missed words (words that were due but not studied)
  loadMissedWords(): void {
    this.spacedRepetitionService.getAllRepetitions().subscribe({
      next: (repetitions) => {
        const now = new Date();
        now.setHours(0, 0, 0, 0);
        
        // Find words that are past their due date (nextReviewAt < today) and haven't been reviewed
        // These are words that were due but the user didn't study them
        const missedRepetitions = repetitions.filter(r => {
          if (!r.vocabularyId || !r.nextReviewAt) return false;
          
          const reviewDate = new Date(r.nextReviewAt);
          reviewDate.setHours(0, 0, 0, 0);
          
          // Word is missed if:
          // 1. It has a vocabularyId (word-level)
          // 2. nextReviewAt is in the past (before today)
          // 3. Status is New or Learning (not Mastered)
          return reviewDate < now 
            && (r.status === 'New' || r.status === 'Learning')
            && r.vocabularyId !== null;
        });

        if (missedRepetitions.length === 0) {
          this.missedWords = [];
          return;
        }

        // Load actual vocabulary words
        const uniqueListIds = new Set<number>();
        const wordToRepetitionMap = new Map<number, SpacedRepetition>();
        
        missedRepetitions.forEach(rep => {
          if (rep.vocabularyListId) {
            uniqueListIds.add(rep.vocabularyListId);
          }
          if (rep.vocabularyId) {
            wordToRepetitionMap.set(rep.vocabularyId, rep);
          }
        });

        const vocabularyRequests = Array.from(uniqueListIds).map(listId => 
          this.vocabularyService.getVocabularies(listId)
        );

        forkJoin(vocabularyRequests).subscribe({
          next: (vocabulariesArrays) => {
            const missedWordsMap = new Map<number, VocabularyWithReview>();
            
            Array.from(uniqueListIds).forEach((listId, index) => {
              const vocabularies = vocabulariesArrays[index] || [];
              
              vocabularies.forEach(vocab => {
                const vocabId = vocab.id;
                if (vocabId && wordToRepetitionMap.has(vocabId)) {
                  const reviewRecord = wordToRepetitionMap.get(vocabId)!;
                  
                  missedWordsMap.set(vocabId, {
                    vocabulary: vocab,
                    reviewInfo: {
                      vocabularyListId: reviewRecord.vocabularyListId,
                      vocabularyListName: reviewRecord.vocabularyListName,
                      nextReviewAt: reviewRecord.nextReviewAt,
                      reviewCount: reviewRecord.reviewCount,
                      status: reviewRecord.status,
                      bestQuizScore: reviewRecord.bestQuizScore,
                      lastQuizScore: reviewRecord.lastQuizScore,
                      totalQuizAttempts: reviewRecord.totalQuizAttempts,
                      intervals: reviewRecord.intervals
                    }
                  });
                }
              });
            });

            this.missedWords = Array.from(missedWordsMap.values());
            
            // Sort by how many days overdue
            this.missedWords.sort((a, b) => {
              if (!a.reviewInfo.nextReviewAt || !b.reviewInfo.nextReviewAt) return 0;
              const dateA = new Date(a.reviewInfo.nextReviewAt);
              const dateB = new Date(b.reviewInfo.nextReviewAt);
              return dateA.getTime() - dateB.getTime();
            });
          },
          error: (error) => {
            console.error('Error loading missed vocabularies:', error);
            this.missedWords = [];
          }
        });
      },
      error: (error) => {
        console.error('Error loading missed words:', error);
        this.missedWords = [];
      }
    });
  }

  // Format date
  formatDate(dateString?: string | null): string {
    if (!dateString) return 'Chưa có';
    const date = new Date(dateString);
    return date.toLocaleDateString('vi-VN', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric'
    });
  }

  // Format datetime
  formatDateTime(dateString?: string | null): string {
    if (!dateString) return 'Chưa có';
    const date = new Date(dateString);
    return date.toLocaleDateString('vi-VN', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  }

  // Get days until review
  getDaysUntilReview(dateString?: string | null): number {
    if (!dateString) return 0;
    const reviewDate = new Date(dateString);
    const now = new Date();
    const diffTime = reviewDate.getTime() - now.getTime();
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    return diffDays;
  }

  // Get status badge class
  getStatusBadgeClass(status: string): string {
    switch (status.toLowerCase()) {
      case 'new':
        return 'badge-new';
      case 'learning':
        return 'badge-learning';
      case 'mastered':
        return 'badge-mastered';
      default:
        return 'badge-default';
    }
  }

  // Get filtered repetitions
  get filteredRepetitions(): SpacedRepetition[] {
    if (!this.allRepetitions || this.allRepetitions.length === 0) return [];
    
    switch (this.filterStatus) {
      case 'due':
        return this.allRepetitions.filter(r => r.isDue);
      case 'learning':
        return this.allRepetitions.filter(r => r.status === 'Learning');
      case 'mastered':
        return this.allRepetitions.filter(r => r.status === 'Mastered');
      default:
        return this.allRepetitions;
    }
  }

  // Set filter
  setFilter(status: 'all' | 'due' | 'learning' | 'mastered'): void {
    this.filterStatus = status;
  }

  // Pagination for upcoming vocabularies
  get paginatedUpcomingVocabularies(): VocabularyWithReview[] {
    const startIndex = (this.currentUpcomingPage - 1) * this.upcomingPageSize;
    const endIndex = startIndex + this.upcomingPageSize;
    return this.upcomingVocabularies.slice(startIndex, endIndex);
  }

  get totalUpcomingPages(): number {
    return Math.ceil(this.upcomingVocabularies.length / this.upcomingPageSize);
  }

  goToUpcomingPage(page: number): void {
    if (page >= 1 && page <= this.totalUpcomingPages) {
      this.currentUpcomingPage = page;
      // Scroll to top of section
      const element = document.querySelector('.vocabulary-grid');
      if (element) {
        element.scrollIntoView({ behavior: 'smooth', block: 'start' });
      }
    }
  }

  previousUpcomingPage(): void {
    if (this.currentUpcomingPage > 1) {
      this.goToUpcomingPage(this.currentUpcomingPage - 1);
    }
  }

  nextUpcomingPage(): void {
    if (this.currentUpcomingPage < this.totalUpcomingPages) {
      this.goToUpcomingPage(this.currentUpcomingPage + 1);
    }
  }

  getPageNumbers(): number[] {
    const total = this.totalUpcomingPages;
    const current = this.currentUpcomingPage;
    const pages: number[] = [];
    
    if (total <= 7) {
      // Hiển thị tất cả các trang nếu <= 7
      for (let i = 1; i <= total; i++) {
        pages.push(i);
      }
    } else {
      // Hiển thị với ellipsis
      if (current <= 3) {
        // Trang đầu
        for (let i = 1; i <= 4; i++) pages.push(i);
        pages.push(-1); // Ellipsis
        pages.push(total);
      } else if (current >= total - 2) {
        // Trang cuối
        pages.push(1);
        pages.push(-1); // Ellipsis
        for (let i = total - 3; i <= total; i++) pages.push(i);
      } else {
        // Trang giữa
        pages.push(1);
        pages.push(-1); // Ellipsis
        for (let i = current - 1; i <= current + 1; i++) pages.push(i);
        pages.push(-1); // Ellipsis
        pages.push(total);
      }
    }
    
    return pages;
  }

  // Go back
  goBack(): void {
    this.router.navigate(['/vocabulary']);
  }

  // Organize folders into unlearned and learned (grouped by date)
  organizeFolders(repetitions: SpacedRepetition[]): void {
    const now = new Date();
    now.setHours(0, 0, 0, 0);
    
    // Loại bỏ duplicate theo vocabularyListId - chỉ giữ 1 bản ghi cho mỗi list
    const uniqueFolders = new Map<number, SpacedRepetition>();
    
    repetitions.forEach(rep => {
      const existing = uniqueFolders.get(rep.vocabularyListId);
      
      if (!existing) {
        uniqueFolders.set(rep.vocabularyListId, rep);
      } else {
        // Ưu tiên bản ghi có tiến độ hoặc mới hơn
        const currentHasProgress = (rep.reviewCount > 0) || (rep.bestQuizScore || rep.lastQuizScore);
        const existingHasProgress = (existing.reviewCount > 0) || (existing.bestQuizScore || existing.lastQuizScore);
        
        if (currentHasProgress && !existingHasProgress) {
          uniqueFolders.set(rep.vocabularyListId, rep);
        } else if (rep.userSpacedRepetitionId > existing.userSpacedRepetitionId) {
          uniqueFolders.set(rep.vocabularyListId, rep);
        }
      }
    });
    
    const uniqueRepetitions = Array.from(uniqueFolders.values());
    
    // Tách folders: chưa học vs đã học
    // LƯU Ý: Tất cả repetitions ở đây đã được filter để chỉ có những từ đã đánh giá
    // Nên "unlearned" ở đây có nghĩa là đã đánh giá nhưng chưa thuộc (chưa mastered)
    const unlearned: SpacedRepetition[] = [];
    const learned: SpacedRepetition[] = [];

    uniqueRepetitions.forEach(rep => {
      // Tất cả đều đã có tiến độ (đã được filter ở loadStatistics)
      // "Unlearned" = đã đánh giá nhưng chưa mastered (status != 'Mastered')
      // "Learned" = đã đánh giá và có lịch review
      if (rep.status === 'Mastered') {
        learned.push(rep);
      } else if (rep.reviewCount > 0 || rep.bestQuizScore || rep.lastQuizScore) {
        // Đã đánh giá hoặc làm quiz nhưng chưa mastered
        // Có thể hiển thị trong "unlearned" nếu muốn, hoặc bỏ qua
        // Ở đây ta sẽ không hiển thị "unlearned" nữa vì tất cả đều đã có tiến độ
        learned.push(rep);
      }
    });

    // KHÔNG hiển thị "unlearned folders" nữa vì tất cả đều đã đánh giá
    // Chỉ hiển thị những từ đã được đánh giá trong "learned" (theo lịch học tập)
    this.unlearnedFolders = [];

    // CHỈ HIỂN THỊ "TUẦN NÀY" - Lọc những từ có VocabularyId (word-level) và review trong tuần này
    // CHỈ HIỂN THỊ CÁC TỪ CHƯA HỌC (chưa được review trong tuần này)
    // LOẠI BỎ: các từ cần review hôm nay và các từ trong "Lịch học ngày mai"
    const thisWeekVocabularies: SpacedRepetition[] = [];
    
    // Tính ngày đầu tuần (hôm nay) và ngày mai
    const weekStart = new Date(now);
    const tomorrow = new Date(now);
    tomorrow.setDate(tomorrow.getDate() + 1);
    tomorrow.setHours(0, 0, 0, 0);
    const dayAfterTomorrow = new Date(tomorrow);
    dayAfterTomorrow.setDate(dayAfterTomorrow.getDate() + 1);
    
    learned.forEach(rep => {
      // Chỉ lấy word-level records (có VocabularyId)
      if (!rep.vocabularyId) return;
      
      if (!rep.nextReviewAt) return;
      
      const reviewDate = new Date(rep.nextReviewAt);
      reviewDate.setHours(0, 0, 0, 0);
      const diffTime = reviewDate.getTime() - now.getTime();
      const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

      // LOẠI BỎ các từ cần review hôm nay (nextReviewAt <= hôm nay)
      if (reviewDate <= now) return;
      
      // LOẠI BỎ các từ trong "Lịch học ngày mai" (nextReviewAt = ngày mai)
      if (reviewDate >= tomorrow && reviewDate < dayAfterTomorrow) return;

      // Chỉ lấy những từ review trong tuần này (2-7 ngày nữa)
      if (diffDays >= 2 && diffDays <= 7) {
        // KIỂM TRA: Từ này chưa được review trong tuần này
        // Nếu lastReviewedAt không có hoặc lastReviewedAt < đầu tuần này thì chưa học
        let isNotReviewedThisWeek = true;
        
        if (rep.lastReviewedAt) {
          const lastReviewedDate = new Date(rep.lastReviewedAt);
          lastReviewedDate.setHours(0, 0, 0, 0);
          
          // Nếu đã được review trong tuần này (từ đầu tuần đến giờ) thì không hiển thị
          if (lastReviewedDate >= weekStart) {
            isNotReviewedThisWeek = false;
          }
        }
        
        // Chỉ thêm nếu chưa được review trong tuần này
        if (isNotReviewedThisWeek) {
          thisWeekVocabularies.push(rep);
        }
      }
    });

    // Chỉ tạo 1 group "Tuần này"
    if (thisWeekVocabularies.length > 0) {
      this.learnedFoldersByDate = [{
        date: 'this-week',
        label: 'Tuần này',
        folders: thisWeekVocabularies.sort((a, b) => {
          if (!a.nextReviewAt || !b.nextReviewAt) return 0;
          return new Date(a.nextReviewAt).getTime() - new Date(b.nextReviewAt).getTime();
        })
      }];
    } else {
      this.learnedFoldersByDate = [];
    }
    
    // Load vocabularies cho các date groups
    this.loadVocabulariesForDateGroups(this.learnedFoldersByDate);
  }

  loadVocabulariesForDateGroups(dateGroups: { date: string; label: string; folders: SpacedRepetition[] }[]): void {
    // Khởi tạo với empty arrays trước
    this.learnedVocabulariesByDate = dateGroups.map(dateGroup => ({
      date: dateGroup.date,
      label: dateGroup.label,
      vocabularies: [],
      currentPage: 1,
      pageSize: 9
    }));
    
    dateGroups.forEach((dateGroup, groupIndex) => {
      // Lưu dateGroup vào biến local để tránh closure issues
      const currentDateGroup = { ...dateGroup };
      
      // Loại bỏ duplicate folders
      const uniqueFoldersMap = new Map<number, SpacedRepetition>();
      currentDateGroup.folders.forEach(folder => {
        if (!uniqueFoldersMap.has(folder.vocabularyListId)) {
          uniqueFoldersMap.set(folder.vocabularyListId, folder);
        }
      });
      const uniqueFolders = Array.from(uniqueFoldersMap.values());

      if (uniqueFolders.length === 0) {
        // Đã khởi tạo ở trên, không cần làm gì
        return;
      }

      // Load vocabularies từ các folders
      const vocabularyRequests = uniqueFolders.map(folder => 
        this.vocabularyService.getVocabularies(folder.vocabularyListId)
      );

      forkJoin(vocabularyRequests).subscribe({
        next: (vocabulariesArrays) => {
          const uniqueVocabulariesMap = new Map<number | string, VocabularyWithReview>();
          
          // Tạo map từ allRepetitions để tìm những từ đã được đánh giá (có VocabularyId)
          const reviewedVocabMap = new Map<number, SpacedRepetition>();
          this.allRepetitions.forEach(rep => {
            if (rep.vocabularyId !== null && rep.vocabularyId !== undefined) {
              reviewedVocabMap.set(rep.vocabularyId, rep);
            }
          });
          
          uniqueFolders.forEach((folder, index) => {
            const vocabularies = vocabulariesArrays[index] || [];
            
            // CHỈ HIỂN THỊ NHỮNG TỪ ĐÃ ĐƯỢC ĐÁNH GIÁ (có record trong reviewedVocabMap)
            vocabularies.forEach(vocab => {
              const vocabId: number | string = vocab.id || vocab.word?.toLowerCase() || '';
              const vocabIdNum = typeof vocabId === 'number' ? vocabId : null;
              
              // Chỉ thêm nếu từ này đã được đánh giá (có record với VocabularyId)
              if (vocabIdNum && reviewedVocabMap.has(vocabIdNum)) {
                const reviewRecord = reviewedVocabMap.get(vocabIdNum)!;
                
                if (!uniqueVocabulariesMap.has(vocabId)) {
                  uniqueVocabulariesMap.set(vocabId, {
                    vocabulary: vocab,
                    reviewInfo: {
                      vocabularyListId: reviewRecord.vocabularyListId,
                      vocabularyListName: reviewRecord.vocabularyListName,
                      nextReviewAt: reviewRecord.nextReviewAt,
                      reviewCount: reviewRecord.reviewCount,
                      status: reviewRecord.status,
                      bestQuizScore: reviewRecord.bestQuizScore,
                      lastQuizScore: reviewRecord.lastQuizScore,
                      totalQuizAttempts: reviewRecord.totalQuizAttempts,
                      intervals: reviewRecord.intervals
                    }
                  });
                } else {
                  const existing = uniqueVocabulariesMap.get(vocabId)!;
                  if (reviewRecord.nextReviewAt && existing.reviewInfo.nextReviewAt) {
                    const existingDate = new Date(existing.reviewInfo.nextReviewAt);
                    const currentDate = new Date(reviewRecord.nextReviewAt);
                    if (currentDate < existingDate) {
                      uniqueVocabulariesMap.set(vocabId, {
                        vocabulary: vocab,
                        reviewInfo: {
                          vocabularyListId: reviewRecord.vocabularyListId,
                          vocabularyListName: reviewRecord.vocabularyListName,
                          nextReviewAt: reviewRecord.nextReviewAt,
                          reviewCount: reviewRecord.reviewCount,
                          status: reviewRecord.status,
                          bestQuizScore: reviewRecord.bestQuizScore,
                          lastQuizScore: reviewRecord.lastQuizScore,
                          totalQuizAttempts: reviewRecord.totalQuizAttempts,
                          intervals: reviewRecord.intervals
                        }
                      });
                    }
                  }
                }
              }
            });
          });

          const vocabularies = Array.from(uniqueVocabulariesMap.values());
          vocabularies.sort((a, b) => {
            if (!a.reviewInfo.nextReviewAt || !b.reviewInfo.nextReviewAt) return 0;
            return new Date(a.reviewInfo.nextReviewAt).getTime() - new Date(b.reviewInfo.nextReviewAt).getTime();
          });

          // Cập nhật date group trong learnedVocabulariesByDate
          const targetGroup = this.learnedVocabulariesByDate.find(g => g.date === currentDateGroup.date);
          if (targetGroup) {
            targetGroup.vocabularies = vocabularies;
          }
        },
        error: (error) => {
          console.error('Error loading vocabularies for date group:', currentDateGroup.date, error);
          // Đảm bảo group vẫn tồn tại với empty array
          const targetGroup = this.learnedVocabulariesByDate.find(g => g.date === currentDateGroup.date);
          if (targetGroup && targetGroup.vocabularies.length === 0) {
            // Giữ nguyên empty array
          }
        }
      });
    });
  }

  // Pagination methods for learned vocabularies by date
  getPaginatedVocabulariesForDate(dateGroup: { vocabularies: VocabularyWithReview[]; currentPage: number; pageSize: number }): VocabularyWithReview[] {
    if (!dateGroup || !dateGroup.vocabularies || dateGroup.vocabularies.length === 0) {
      return [];
    }
    const startIndex = (dateGroup.currentPage - 1) * dateGroup.pageSize;
    const endIndex = startIndex + dateGroup.pageSize;
    return dateGroup.vocabularies.slice(startIndex, endIndex);
  }

  getTotalPagesForDate(dateGroup: { vocabularies: VocabularyWithReview[]; pageSize: number }): number {
    if (!dateGroup || !dateGroup.vocabularies || dateGroup.vocabularies.length === 0) {
      return 0;
    }
    return Math.ceil(dateGroup.vocabularies.length / dateGroup.pageSize);
  }

  goToPageForDate(dateGroup: { date: string }, page: number): void {
    const group = this.learnedVocabulariesByDate.find(g => g.date === dateGroup.date);
    if (group) {
      const totalPages = this.getTotalPagesForDate(group);
      if (page >= 1 && page <= totalPages) {
        group.currentPage = page;
        const element = document.querySelector(`[data-date-group="${dateGroup.date}"]`);
        if (element) {
          element.scrollIntoView({ behavior: 'smooth', block: 'start' });
        }
      }
    }
  }

  previousPageForDate(dateGroup: { date: string }): void {
    const group = this.learnedVocabulariesByDate.find(g => g.date === dateGroup.date);
    if (group && group.currentPage > 1) {
      this.goToPageForDate(dateGroup, group.currentPage - 1);
    }
  }

  nextPageForDate(dateGroup: { date: string }): void {
    const group = this.learnedVocabulariesByDate.find(g => g.date === dateGroup.date);
    if (group) {
      const totalPages = this.getTotalPagesForDate(group);
      if (group.currentPage < totalPages) {
        this.goToPageForDate(dateGroup, group.currentPage + 1);
      }
    }
  }

  // Get days overdue for missed words
  public getDaysOverdue(nextReviewAt: string | null | undefined): number {
    if (!nextReviewAt) return 0;
    const reviewDate = new Date(nextReviewAt);
    reviewDate.setHours(0, 0, 0, 0);
    const now = new Date();
    now.setHours(0, 0, 0, 0);
    const diffTime = now.getTime() - reviewDate.getTime();
    const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24));
    return Math.max(0, diffDays);
  }
}

// Interface cho vocabulary với thông tin review
export interface VocabularyWithReview {
  vocabulary: VocabularyWord;
  reviewInfo: {
    vocabularyListId: number;
    vocabularyListName: string;
    nextReviewAt?: string | null;
    reviewCount: number;
    status: string;
    bestQuizScore?: number;
    lastQuizScore?: number;
    totalQuizAttempts?: number;
    intervals: number;
  };
}

