import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router, RouterModule } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { HeaderComponent } from '../../Views/Common/header/header.component';
import { SpacedRepetitionService, SpacedRepetition } from '../../Services/spaced-repetition/spaced-repetition.service';
import { VocabularyService } from '../../Services/Vocabulary/vocabulary.service';
import { VocabularyWord } from '../../Interfaces/vocabulary.interfaces';
import { forkJoin } from 'rxjs';

interface VocabularyTableRow {
    vocabularyId: number;
    word: string;
    definition: string;
    category?: string;
    type?: string;

    
    status: string;
    intervals: number;
    reviewCount: number;
    quality?: number; 

  
    lastReviewedAt?: string | null;
    nextReviewAt?: string | null;

    // Quiz performance
    bestQuizScore?: number;
    lastQuizScore?: number;
    totalQuizAttempts?: number;

    // List Info
    vocabularyListId: number;
    vocabularyListName: string;
}

@Component({
    selector: 'app-vocabulary-list-table',
    standalone: true,
    imports: [CommonModule, RouterModule, HeaderComponent, FormsModule],
    templateUrl: './vocabulary-list-table.component.html',
    styleUrls: ['./vocabulary-list-table.component.scss']
})
export class VocabularyListTableComponent implements OnInit {
    vocabularyRows: VocabularyTableRow[] = [];
    filteredRows: VocabularyTableRow[] = [];

    // Loading state
    isLoading = false;

    // Filters
    searchQuery = '';
    statusFilter: 'all' | 'New' | 'Learning' | 'Mastered' = 'all';
    sortBy: 'word' | 'intervals' | 'nextReview' | 'status' = 'nextReview';
    sortDirection: 'asc' | 'desc' = 'asc';

    // Pagination
    currentPage = 1;
    pageSize = 20;

    constructor(
        private spacedRepetitionService: SpacedRepetitionService,
        private vocabularyService: VocabularyService,
        private router: Router
    ) { }

    ngOnInit(): void {
        this.loadAllVocabulary();
    }

    loadAllVocabulary(): void {
        this.isLoading = true;

        this.spacedRepetitionService.getAllRepetitions().subscribe({
            next: (repetitions) => {
                // Only get word-level repetitions
                const wordRepetitions = repetitions.filter(r =>
                    r.vocabularyId !== null && r.vocabularyId !== undefined
                );

                if (wordRepetitions.length === 0) {
                    this.vocabularyRows = [];
                    this.applyFilters();
                    this.isLoading = false;
                    return;
                }

                // Get unique list IDs
                const uniqueListIds = new Set<number>();
                wordRepetitions.forEach(rep => {
                    if (rep.vocabularyListId) {
                        uniqueListIds.add(rep.vocabularyListId);
                    }
                });

                // Load vocabularies from all lists
                const vocabularyRequests = Array.from(uniqueListIds).map(listId =>
                    this.vocabularyService.getVocabularies(listId)
                );

                forkJoin(vocabularyRequests).subscribe({
                    next: (vocabulariesArrays) => {
                        const rows: VocabularyTableRow[] = [];

                        Array.from(uniqueListIds).forEach((listId, index) => {
                            const vocabularies = vocabulariesArrays[index] || [];

                            vocabularies.forEach(vocab => {
                                if (!vocab.id) return;

                                const repetition = wordRepetitions.find(r => r.vocabularyId === vocab.id);

                                if (repetition) {
                                    // Calculate quality based on available data
                                    let quality: number | undefined;

                                    // Method 1: Use lastQuizScore if available
                                    if (repetition.lastQuizScore !== undefined && repetition.lastQuizScore !== null) {
                                        // Map quiz score (0-100) to quality (0-5)
                                        if (repetition.lastQuizScore >= 90) quality = 5;
                                        else if (repetition.lastQuizScore >= 80) quality = 4;
                                        else if (repetition.lastQuizScore >= 70) quality = 3;
                                        else if (repetition.lastQuizScore >= 60) quality = 2;
                                        else if (repetition.lastQuizScore >= 50) quality = 1;
                                        else quality = 0;
                                    }
                                    // Method 2: Estimate quality based on interval and status
                                    else {
                                        // Estimate quality based on how well they're progressing
                                        // Higher interval = Better retention = Higher quality
                                        const interval = repetition.intervals;
                                        const reviewCount = repetition.reviewCount;
                                        const status = repetition.status;

                                        if (status === 'Mastered') {
                                            quality = 5; // Mastered = excellent quality
                                        } else if (status === 'Learning') {
                                            // Calculate based on interval progression
                                            if (interval >= 30) quality = 4;
                                            else if (interval >= 15) quality = 3;
                                            else if (interval >= 6) quality = 3;
                                            else if (interval >= 3) quality = 2;
                                            else quality = 2;
                                        } else if (status === 'New') {
                                            // New words that have been reviewed at least once
                                            if (reviewCount > 0) {
                                                quality = interval > 1 ? 3 : 2;
                                            } else {
                                                quality = undefined; // Not reviewed yet
                                            }
                                        }
                                    }

                                    rows.push({
                                        vocabularyId: vocab.id,
                                        word: vocab.word || '',
                                        definition: vocab.definition || '',
                                        category: vocab.category,
                                        type: vocab.type,

                                        status: repetition.status,
                                        intervals: repetition.intervals,
                                        reviewCount: repetition.reviewCount,
                                        quality,

                                        lastReviewedAt: repetition.lastReviewedAt,
                                        nextReviewAt: repetition.nextReviewAt,

                                        bestQuizScore: repetition.bestQuizScore,
                                        lastQuizScore: repetition.lastQuizScore,
                                        totalQuizAttempts: repetition.totalQuizAttempts,

                                        vocabularyListId: repetition.vocabularyListId,
                                        vocabularyListName: repetition.vocabularyListName
                                    });
                                }
                            });
                        });

                        this.vocabularyRows = rows;
                        this.applyFilters();
                        this.isLoading = false;
                    },
                    error: (error) => {
                        console.error('Error loading vocabularies:', error);
                        this.isLoading = false;
                    }
                });
            },
            error: (error) => {
                console.error('Error loading repetitions:', error);
                this.isLoading = false;
            }
        });
    }

    applyFilters(): void {
        let filtered = [...this.vocabularyRows];

        // Search filter
        if (this.searchQuery.trim()) {
            const query = this.searchQuery.toLowerCase();
            filtered = filtered.filter(row =>
                row.word.toLowerCase().includes(query) ||
                row.definition.toLowerCase().includes(query)
            );
        }

        // Status filter
        if (this.statusFilter !== 'all') {
            filtered = filtered.filter(row => row.status === this.statusFilter);
        }

        // Sort
        filtered.sort((a, b) => {
            let comparison = 0;

            switch (this.sortBy) {
                case 'word':
                    comparison = a.word.localeCompare(b.word);
                    break;
                case 'intervals':
                    comparison = a.intervals - b.intervals;
                    break;
                case 'nextReview':
                    if (!a.nextReviewAt && !b.nextReviewAt) comparison = 0;
                    else if (!a.nextReviewAt) comparison = 1;
                    else if (!b.nextReviewAt) comparison = -1;
                    else comparison = new Date(a.nextReviewAt).getTime() - new Date(b.nextReviewAt).getTime();
                    break;
                case 'status':
                    comparison = a.status.localeCompare(b.status);
                    break;
            }

            return this.sortDirection === 'asc' ? comparison : -comparison;
        });

        this.filteredRows = filtered;
        this.currentPage = 1; // Reset to first page
    }

    // Pagination
    get paginatedRows(): VocabularyTableRow[] {
        const startIndex = (this.currentPage - 1) * this.pageSize;
        const endIndex = startIndex + this.pageSize;
        return this.filteredRows.slice(startIndex, endIndex);
    }

    get totalPages(): number {
        return Math.ceil(this.filteredRows.length / this.pageSize);
    }

    goToPage(page: number): void {
        if (page >= 1 && page <= this.totalPages) {
            this.currentPage = page;
            window.scrollTo({ top: 0, behavior: 'smooth' });
        }
    }

    previousPage(): void {
        if (this.currentPage > 1) {
            this.goToPage(this.currentPage - 1);
        }
    }

    nextPage(): void {
        if (this.currentPage < this.totalPages) {
            this.goToPage(this.currentPage + 1);
        }
    }

    // Sorting
    setSortBy(field: 'word' | 'intervals' | 'nextReview' | 'status'): void {
        if (this.sortBy === field) {
            this.sortDirection = this.sortDirection === 'asc' ? 'desc' : 'asc';
        } else {
            this.sortBy = field;
            this.sortDirection = 'asc';
        }
        this.applyFilters();
    }

    // Formatting helpers
    formatDate(dateString?: string | null): string {
        if (!dateString) return 'Chưa có';
        const date = new Date(dateString);
        return date.toLocaleDateString('vi-VN', {
            day: '2-digit',
            month: '2-digit',
            year: 'numeric'
        });
    }

    getDaysUntilReview(dateString?: string | null): number {
        if (!dateString) return 0;
        const reviewDate = new Date(dateString);
        reviewDate.setHours(0, 0, 0, 0);
        const now = new Date();
        now.setHours(0, 0, 0, 0);
        const diffTime = reviewDate.getTime() - now.getTime();
        const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
        return diffDays;
    }

    getIntervalMilestones(intervals: number): string {
        // Show typical SM-2 milestones
        const milestones = [1, 6, 15, 30, 60, 90];
        const current = intervals;
        const milestone = milestones.find(m => m >= current) || 90;
        return `${current} → ${milestone} ngày`;
    }

    getStatusClass(status: string): string {
        switch (status) {
            case 'New':
                return 'status-new';
            case 'Learning':
                return 'status-learning';
            case 'Mastered':
                return 'status-mastered';
            default:
                return 'status-default';
        }
    }

    getQualityClass(quality?: number): string {
        if (quality === undefined) return 'quality-none';
        if (quality >= 4) return 'quality-high';
        if (quality >= 3) return 'quality-medium';
        return 'quality-low';
    }

    // Navigation
    goBack(): void {
        this.router.navigate(['/spaced-repetition/dashboard']);
    }

    goToDeck(listId: number): void {
        this.router.navigate(['/flashcards', listId]);
    }
}
