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
 
  spacedRepetitionStats: {
    dueToday: number;
    mastered: number;
    upcoming: number; 
  } | null = null;


  dueTodayLists: SpacedRepetition[] = [];
  public dueTodayWords: VocabularyWithReview[] = [];
  public missedWords: VocabularyWithReview[] = []; 
  upcomingLists: SpacedRepetition[] = [];
  allRepetitions: SpacedRepetition[] = [];


  unlearnedFolders: SpacedRepetition[] = []; 
  learnedFoldersByDate: { date: string; label: string; folders: SpacedRepetition[] }[] = []; 
  learnedVocabulariesByDate: { date: string; label: string; vocabularies: VocabularyWithReview[]; currentPage: number; pageSize: number }[] = []; 

  upcomingVocabularies: VocabularyWithReview[] = [];

  currentUpcomingPage = 1;
  upcomingPageSize = 9;

  isLoadingStats = false;
  isLoadingDue = false;
  isLoadingUpcoming = false;

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

    forkJoin({
      allRepetitions: this.spacedRepetitionService.getAllRepetitions(),
      dueForReview: this.spacedRepetitionService.getDueForReview()
    }).subscribe({
      next: ({ allRepetitions, dueForReview }) => {

        const now = new Date();
        const today = new Date(now);
        today.setHours(0, 0, 0, 0);
        const tomorrow = new Date(today);
        tomorrow.setDate(tomorrow.getDate() + 1);

        const reviewedRepetitions = allRepetitions.filter(r =>
          (r.vocabularyId !== null && r.vocabularyId !== undefined) || 
          (r.reviewCount > 0 || r.bestQuizScore !== undefined || r.lastQuizScore !== undefined) 
        );

      
        const dueTodayWordLevel = dueForReview.filter(r => r.vocabularyId !== null && r.vocabularyId !== undefined);

        const dueToday = dueTodayWordLevel.filter(r => {
          if (!r.lastReviewedAt) return true; 
          const lastReviewedDate = new Date(r.lastReviewedAt);
          lastReviewedDate.setHours(0, 0, 0, 0);

          if (lastReviewedDate.getTime() === today.getTime() && r.intervals > 1) {
            return false;
          }

          return true;
        });

        const mastered = reviewedRepetitions.filter(r => {
          if (!r.vocabularyId || r.vocabularyId === null || r.vocabularyId === undefined) return false;
          return r.status === 'Mastered';
        });

        const upcoming = reviewedRepetitions.filter(r => {
          if (!r.vocabularyId || r.vocabularyId === null || r.vocabularyId === undefined) return false;

     
          const isActive = r.status === 'New' || r.status === 'Learning';

          const isDueToday = dueToday.some(d => d.vocabularyId === r.vocabularyId);

          return isActive && !isDueToday;
        });

        this.spacedRepetitionStats = {
          dueToday: dueToday.length,
          mastered: mastered.length,
          upcoming: upcoming.length
        };


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
        this.dueTodayLists = repetitions.filter(r => !r.vocabularyId || r.vocabularyId === null);

       
        const wordLevelRepetitions = repetitions.filter(r => r.vocabularyId !== null && r.vocabularyId !== undefined);

        const today = new Date();
        today.setHours(0, 0, 0, 0);

        const filteredWordLevelRepetitions = wordLevelRepetitions.filter(r => {
          if (!r.lastReviewedAt) return true;

          const lastReviewedDate = new Date(r.lastReviewedAt);
          lastReviewedDate.setHours(0, 0, 0, 0);

          if (lastReviewedDate.getTime() === today.getTime() && r.intervals > 1) {
            return false;
          }

          return true;
        });

        if (filteredWordLevelRepetitions.length > 0) {
        
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

        
        const reviewedRepetitions = repetitions.filter(r =>
          (r.vocabularyId !== null && r.vocabularyId !== undefined) || 
          (r.reviewCount > 0 || r.bestQuizScore !== undefined || r.lastQuizScore !== undefined) 
        );


        const tomorrowVocabularies = reviewedRepetitions
          .filter(r => {
            if (!r.nextReviewAt || !r.vocabularyId) return false; 
            const reviewDate = new Date(r.nextReviewAt);
            reviewDate.setHours(0, 0, 0, 0);

            const isTomorrow = reviewDate >= tomorrow && reviewDate < dayAfterTomorrow;
            const isActive = (r.status === 'New' || r.status === 'Learning');

            return isTomorrow && isActive;
          })
          .sort((a, b) => {
            if (!a.nextReviewAt || !b.nextReviewAt) return 0;
            return new Date(a.nextReviewAt).getTime() - new Date(b.nextReviewAt).getTime();
          });

        
        const reviewedVocabMap = new Map<number, SpacedRepetition>();
        tomorrowVocabularies.forEach(rep => {
          if (rep.vocabularyId !== null && rep.vocabularyId !== undefined) {
            reviewedVocabMap.set(rep.vocabularyId, rep);
          }
        });

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

        const vocabularyRequests = Array.from(uniqueListIds).map(listId =>
          this.vocabularyService.getVocabularies(listId)
        );

        forkJoin(vocabularyRequests).subscribe({
          next: (vocabulariesArrays) => {
            const uniqueVocabulariesMap = new Map<number | string, VocabularyWithReview>();

            Array.from(uniqueListIds).forEach((listId, index) => {
              const vocabularies = vocabulariesArrays[index] || [];

              vocabularies.forEach(vocab => {
                const vocabId: number | string = vocab.id || vocab.word?.toLowerCase() || '';
                const vocabIdNum = typeof vocabId === 'number' ? vocabId : null;

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

   
            this.upcomingVocabularies = Array.from(uniqueVocabulariesMap.values());

         
            this.upcomingVocabularies.sort((a, b) => {
              if (!a.reviewInfo.nextReviewAt || !b.reviewInfo.nextReviewAt) return 0;
              return new Date(a.reviewInfo.nextReviewAt).getTime() - new Date(b.reviewInfo.nextReviewAt).getTime();
            });

          
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

    const uniqueFoldersMap = new Map<number, SpacedRepetition>();
    folders.forEach(folder => {
      if (!uniqueFoldersMap.has(folder.vocabularyListId)) {
        uniqueFoldersMap.set(folder.vocabularyListId, folder);
      }
    });
    const uniqueFolders = Array.from(uniqueFoldersMap.values());

    const vocabularyRequests = uniqueFolders.map(folder =>
      this.vocabularyService.getVocabularies(folder.vocabularyListId)
    );

    forkJoin(vocabularyRequests).subscribe({
      next: (vocabulariesArrays) => {
       
        const uniqueVocabulariesMap = new Map<number | string, VocabularyWithReview>();

        const reviewedVocabMap = new Map<number, SpacedRepetition>();
        this.allRepetitions.forEach(rep => {
          if (rep.vocabularyId !== null && rep.vocabularyId !== undefined) {
            reviewedVocabMap.set(rep.vocabularyId, rep);
          }
        });

        uniqueFolders.forEach((folder, index) => {
          const vocabularies = vocabulariesArrays[index] || [];

    
          vocabularies.forEach(vocab => {

            const vocabId: number | string = vocab.id || vocab.word?.toLowerCase() || '';
            const vocabIdNum = typeof vocabId === 'number' ? vocabId : null;

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


        this.upcomingVocabularies = Array.from(uniqueVocabulariesMap.values());

        this.upcomingVocabularies.sort((a, b) => {
          if (!a.reviewInfo.nextReviewAt || !b.reviewInfo.nextReviewAt) return 0;
          return new Date(a.reviewInfo.nextReviewAt).getTime() - new Date(b.reviewInfo.nextReviewAt).getTime();
        });

        this.currentUpcomingPage = 1;

        this.isLoadingUpcoming = false;
      },
      error: (error) => {
        console.error('Error loading vocabularies:', error);
        this.isLoadingUpcoming = false;
      }
    });
  }

  goToDeck(listId: number): void {
    this.router.navigate(['/flashcards', listId]);
  }

  startDueReviews(): void {
    if (this.dueTodayLists && this.dueTodayLists.length > 0) {
    
      this.router.navigate(['/flashcards', this.dueTodayLists[0].vocabularyListId]);
    }
  }

  public startReviewQuiz(): void {
    if (this.dueTodayWords && this.dueTodayWords.length > 0) {
    
      this.router.navigate(['/spaced-repetition/review-quiz'], {
        queryParams: {
          words: this.dueTodayWords.map(w => w.vocabulary.id).filter(id => id !== undefined).join(',')
        }
      });
    }
  }

  loadMissedWords(): void {
    this.spacedRepetitionService.getAllRepetitions().subscribe({
      next: (repetitions) => {
        const now = new Date();
        now.setHours(0, 0, 0, 0);

        const missedRepetitions = repetitions.filter(r => {
          if (!r.vocabularyId || !r.nextReviewAt) return false;

          const reviewDate = new Date(r.nextReviewAt);
          reviewDate.setHours(0, 0, 0, 0);

          return reviewDate < now
            && (r.status === 'New' || r.status === 'Learning')
            && r.vocabularyId !== null;
        });

        if (missedRepetitions.length === 0) {
          this.missedWords = [];
          return;
        }

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

  formatDate(dateString?: string | null): string {
    if (!dateString) return 'Chưa có';
    const date = new Date(dateString);
    return date.toLocaleDateString('vi-VN', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric'
    });
  }
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

  getDaysUntilReview(dateString?: string | null): number {
    if (!dateString) return 0;
    const reviewDate = new Date(dateString);
    const now = new Date();
    const diffTime = reviewDate.getTime() - now.getTime();
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    return diffDays;
  }

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

  setFilter(status: 'all' | 'due' | 'learning' | 'mastered'): void {
    this.filterStatus = status;
  }

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


  organizeFolders(repetitions: SpacedRepetition[]): void {
    const now = new Date();
    now.setHours(0, 0, 0, 0);

   
    const uniqueFolders = new Map<number, SpacedRepetition>();

    repetitions.forEach(rep => {
      const existing = uniqueFolders.get(rep.vocabularyListId);

      if (!existing) {
        uniqueFolders.set(rep.vocabularyListId, rep);
      } else {
      
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

    const unlearned: SpacedRepetition[] = [];
    const learned: SpacedRepetition[] = [];

    uniqueRepetitions.forEach(rep => {
      
      if (rep.status === 'Mastered') {
        learned.push(rep);
      } else if (rep.reviewCount > 0 || rep.bestQuizScore || rep.lastQuizScore) {
        
        learned.push(rep);
      }
    });

    this.unlearnedFolders = [];

    const thisWeekVocabularies: SpacedRepetition[] = [];

    const weekStart = new Date(now);
    const tomorrow = new Date(now);
    tomorrow.setDate(tomorrow.getDate() + 1);
    tomorrow.setHours(0, 0, 0, 0);
    const dayAfterTomorrow = new Date(tomorrow);
    dayAfterTomorrow.setDate(dayAfterTomorrow.getDate() + 1);

    learned.forEach(rep => {
      if (!rep.vocabularyId) return;

      if (!rep.nextReviewAt) return;

      const reviewDate = new Date(rep.nextReviewAt);
      reviewDate.setHours(0, 0, 0, 0);
      const diffTime = reviewDate.getTime() - now.getTime();
      const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

      if (reviewDate <= now) return;

      if (reviewDate >= tomorrow && reviewDate < dayAfterTomorrow) return;

      if (diffDays >= 2 && diffDays <= 7) {
        let isNotReviewedThisWeek = true;

        if (rep.lastReviewedAt) {
          const lastReviewedDate = new Date(rep.lastReviewedAt);
          lastReviewedDate.setHours(0, 0, 0, 0);

          if (lastReviewedDate >= weekStart) {
            isNotReviewedThisWeek = false;
          }
        }

        if (isNotReviewedThisWeek) {
          thisWeekVocabularies.push(rep);
        }
      }
    });

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

    this.loadVocabulariesForDateGroups(this.learnedFoldersByDate);
  }

  loadVocabulariesForDateGroups(dateGroups: { date: string; label: string; folders: SpacedRepetition[] }[]): void {
   
    this.learnedVocabulariesByDate = dateGroups.map(dateGroup => ({
      date: dateGroup.date,
      label: dateGroup.label,
      vocabularies: [],
      currentPage: 1,
      pageSize: 9
    }));

    dateGroups.forEach((dateGroup, groupIndex) => {
  
      const currentDateGroup = { ...dateGroup };

      const uniqueFoldersMap = new Map<number, SpacedRepetition>();
      currentDateGroup.folders.forEach(folder => {
        if (!uniqueFoldersMap.has(folder.vocabularyListId)) {
          uniqueFoldersMap.set(folder.vocabularyListId, folder);
        }
      });
      const uniqueFolders = Array.from(uniqueFoldersMap.values());

      if (uniqueFolders.length === 0) {
        return;
      }

      const vocabularyRequests = uniqueFolders.map(folder =>
        this.vocabularyService.getVocabularies(folder.vocabularyListId)
      );

      forkJoin(vocabularyRequests).subscribe({
        next: (vocabulariesArrays) => {
          const uniqueVocabulariesMap = new Map<number | string, VocabularyWithReview>();

          const reviewedVocabMap = new Map<number, SpacedRepetition>();
          this.allRepetitions.forEach(rep => {
            if (rep.vocabularyId !== null && rep.vocabularyId !== undefined) {
              reviewedVocabMap.set(rep.vocabularyId, rep);
            }
          });

          uniqueFolders.forEach((folder, index) => {
            const vocabularies = vocabulariesArrays[index] || [];

            vocabularies.forEach(vocab => {
              const vocabId: number | string = vocab.id || vocab.word?.toLowerCase() || '';
              const vocabIdNum = typeof vocabId === 'number' ? vocabId : null;

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

          const targetGroup = this.learnedVocabulariesByDate.find(g => g.date === currentDateGroup.date);
          if (targetGroup) {
            targetGroup.vocabularies = vocabularies;
          }
        },
        error: (error) => {
          console.error('Error loading vocabularies for date group:', currentDateGroup.date, error);
      
          const targetGroup = this.learnedVocabulariesByDate.find(g => g.date === currentDateGroup.date);
          if (targetGroup && targetGroup.vocabularies.length === 0) {
        
          }
        }
      });
    });
  }

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

