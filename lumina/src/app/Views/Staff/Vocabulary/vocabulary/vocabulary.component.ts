import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule, ReactiveFormsModule, FormBuilder, FormGroup, Validators } from '@angular/forms';
import { Router } from '@angular/router';
import { VocabularyService } from '../../../../Services/Vocabulary/vocabulary.service';
import { ToastService } from '../../../../Services/Toast/toast.service';
import { SpeechService } from '../../../../Services/Speech/speech.service';
import {
  Vocabulary,
  VocabularyCategory,
  VocabularyListResponse,
  VocabularyStats
} from '../../../../Interfaces/vocabulary.interfaces';

@Component({
  selector: 'app-vocabulary',
  standalone: true,
  imports: [CommonModule, FormsModule, ReactiveFormsModule],
  templateUrl: './vocabulary.component.html',
  styleUrls: ['./vocabulary.component.scss']
})
export class VocabularyComponent implements OnInit {
  vocabularies: Vocabulary[] = [];
  filteredVocabularies: Vocabulary[] = [];
  vocabularyLists: VocabularyListResponse[] = [];
  stats: VocabularyStats[] = [];
  searchTerm = '';
  selectedList = '';
  selectedCategory = '';
  selectedDifficulty = '';
  selectedPartOfSpeech = '';
  isModalOpen = false;
  editingVocabulary: Vocabulary | null = null;
  vocabularyForm: FormGroup;
  isLoading = false;
  isSubmitting = false;

  categories: VocabularyCategory[] = [
    { id: 'business', name: 'Business', icon: '💼', count: 0, color: 'blue' },
    { id: 'technology', name: 'Technology', icon: '💻', count: 0, color: 'purple' },
    { id: 'travel', name: 'Travel', icon: '✈️', count: 0, color: 'green' },
    { id: 'health', name: 'Health', icon: '🏥', count: 0, color: 'red' },
    { id: 'finance', name: 'Finance', icon: '💰', count: 0, color: 'orange' },
    { id: 'education', name: 'Education', icon: '🎓', count: 0, color: 'indigo' }
  ];

  page: number = 1;
  pageSize: number = 5; 
  totalItems: number = 0;
  totalPages: number = 0;

  get pagedVocabularies() {
    const start = (this.page - 1) * this.pageSize;
    return this.filteredVocabularies.slice(start, start + this.pageSize);
  }

  updatePagination() {
    this.totalItems = this.filteredVocabularies.length;
    this.totalPages = Math.ceil(this.totalItems / this.pageSize) || 1;
    if (this.page > this.totalPages) {
      this.page = this.totalPages;
    }
  }

  nextPage() {
    if (this.page < this.totalPages) {
      this.page++;
    }
  }

  prevPage() {
    if (this.page > 1) {
      this.page--;
    }
  }

  difficulties = ['Beginner', 'Intermediate', 'Advanced'];
  partsOfSpeech = ['Noun', 'Verb', 'Adjective', 'Adverb', 'Preposition', 'Conjunction'];

  constructor(
    private fb: FormBuilder,
    private router: Router,
    private vocabularyService: VocabularyService,
    private toastService: ToastService,
    private speechService: SpeechService
  ) {
    this.vocabularyForm = this.fb.group({
      word: ['', Validators.required],
      category: ['', Validators.required],
      partOfSpeech: ['', Validators.required],
      definition: ['', Validators.required],
      example: ['', [Validators.required, Validators.minLength(10)]],
      translation: ['', [Validators.required, Validators.minLength(5)]],
      difficulty: ['', Validators.required]
    });
  }

  ngOnInit() {

    this.vocabularyForm = this.fb.group({
      word: ['', Validators.required],
      category: ['', Validators.required],
      partOfSpeech: ['', Validators.required],
      definition: ['', Validators.required],
      example: ['', [Validators.required, Validators.minLength(10)]],
      translation: ['', [Validators.required, Validators.minLength(5)]],
      difficulty: ['', Validators.required]
    });
    this.loadData();
  }

  loadData() {
    this.loadVocabularyLists();
    this.loadStats();
    this.loadVocabularies();
  }

  loadVocabularyLists() {
    this.vocabularyService.getVocabularyLists().subscribe({
      next: (lists) => {
        this.vocabularyLists = lists;
      },
      error: (error) => {
        console.error('Error loading vocabulary lists:', error);
        this.toastService.error('Không thể tải danh sách từ điển');
      }
    });
  }

  loadStats() {
    this.vocabularyService.getVocabularyStats().subscribe({
      next: (statsResponse) => {
        this.stats = statsResponse.countsByList;
      },
      error: (error) => {
        console.error('Error loading stats:', error);
      }
    });
  }

  loadVocabularies(listId?: number, search?: string) {
    this.isLoading = true;
    this.vocabularyService.getVocabularies(listId, search).subscribe({
      next: (vocabularies) => {
        this.vocabularies = vocabularies.map(v => this.vocabularyService.convertToVocabulary(v));
        this.filterVocabularies();
        this.isLoading = false;
      },
      error: (error) => {
        console.error('Error loading vocabularies:', error);
        this.toastService.error('Không thể tải danh sách từ vựng');
        this.isLoading = false;
        this.vocabularies = [];
        this.filterVocabularies();
      }
    });
  }

  filterVocabularies() {
    this.filteredVocabularies = this.vocabularies.filter(vocab => {
      const matchesSearch =
        vocab.word.toLowerCase().includes(this.searchTerm.toLowerCase()) ||
        vocab.definition.toLowerCase().includes(this.searchTerm.toLowerCase()) ||
        vocab.translation.toLowerCase().includes(this.searchTerm.toLowerCase());
      const matchesCategory = !this.selectedCategory || vocab.category === this.selectedCategory;
      const matchesDifficulty = !this.selectedDifficulty || vocab.difficulty === this.selectedDifficulty;
      const matchesPartOfSpeech = !this.selectedPartOfSpeech || vocab.partOfSpeech === this.selectedPartOfSpeech;
      return matchesSearch && matchesCategory && matchesDifficulty && matchesPartOfSpeech;
    });
    this.page = 1;
    this.updatePagination();
  }

  onSearchChange() {
    this.filterVocabularies();
  }

  onListChange() {
    if (this.selectedList) {
      this.loadVocabularies(parseInt(this.selectedList));
    } else {
      this.loadVocabularies();
    }
  }

  onDifficultyChange() { this.filterVocabularies(); }
  onCategoryChange() { this.filterVocabularies(); }
  onPartOfSpeechChange() { this.filterVocabularies(); }

  openModal(vocabulary: Vocabulary | null = null) {
    this.editingVocabulary = vocabulary;
    this.isModalOpen = true;
    if (vocabulary) {
      this.vocabularyForm.patchValue(vocabulary);
    } else {
      this.vocabularyForm.reset();
    }
  }

  closeModal() {
    this.isModalOpen = false;
    this.editingVocabulary = null;
    this.vocabularyForm.reset();
  }

  saveVocabulary() {
    if (this.vocabularyForm.invalid || this.isSubmitting) {
      return;
    }
    this.isSubmitting = true;
    const formData = this.vocabularyForm.value;

    if (this.editingVocabulary) {
      const updateData = {
        word: formData.word,
        typeOfWord: formData.partOfSpeech,
        definition: formData.definition,
        example: formData.example || undefined
      };
      this.vocabularyService.updateVocabulary(this.editingVocabulary.id, updateData).subscribe({
        next: () => {
          this.toastService.success('Cập nhật từ vựng thành công!');
          this.loadData();
          this.closeModal();
          this.isSubmitting = false;
        },
        error: (error) => {
          console.error('Error updating vocabulary:', error);
          this.toastService.error('Không thể cập nhật từ vựng. Vui lòng thử lại.');
          this.isSubmitting = false;
        }
      });
    } else {
      const vocabularyData = {
        vocabularyListId: this.vocabularyLists[0]?.vocabularyListId || 1,
        word: formData.word,
        typeOfWord: formData.partOfSpeech,
        definition: formData.definition,
        example: formData.example || undefined
      };
      this.vocabularyService.createVocabulary(vocabularyData).subscribe({
        next: () => {
          this.toastService.success('Tạo từ vựng thành công!');
          this.loadData();
          this.closeModal();
          this.isSubmitting = false;
        },
        error: (error) => {
          console.error('Error creating vocabulary:', error);
          this.toastService.error('Không thể tạo từ vựng. Vui lòng thử lại.');
          this.isSubmitting = false;
        }
      });
    }
  }

  deleteVocabulary(id: number) {
    if (confirm('Bạn có chắc chắn muốn xóa từ vựng này?')) {
      this.isLoading = true;
      this.vocabularyService.deleteVocabulary(id).subscribe({
        next: () => {
          this.toastService.success('Xóa từ vựng thành công!');
          this.loadData(); // Tải lại toàn bộ dữ liệu để đồng bộ
        },
        error: (error) => {
          console.error('Error deleting vocabulary:', error);
          this.toastService.error('Không thể xóa từ vựng. Vui lòng thử lại.');
          this.isLoading = false;
        }
      });
    }
  }
  clearSearch() {
    this.searchTerm = '';
    this.filterVocabularies();
  }

  clearAllFilters() {
    this.searchTerm = '';
    this.selectedList = '';
    this.selectedCategory = '';
    this.selectedDifficulty = '';
    this.selectedPartOfSpeech = '';
    this.loadVocabularies();
  }

  refreshData() {
    this.toastService.info('Đang làm mới dữ liệu...');
    this.loadData();
  }

  // ========== TEXT-TO-SPEECH METHODS ==========

  /**
   * Phát âm từ vựng
   */
  speakWord(word: string) {
    if (!word || word.trim() === '') {
      this.toastService.warning('Từ vựng không hợp lệ để phát âm.');
      return;
    }

    try {
      this.speechService.speakWord(word);
      this.toastService.success(`Đang phát âm: "${word}"`);
    } catch (error) {
      console.error('Error speaking word:', error);
      this.toastService.error('Không thể phát âm từ này.');
    }
  }

  /**
   * Phát âm câu ví dụ
   */
  speakExample(example: string) {
    if (!example || example.trim() === '') {
      this.toastService.warning('Câu ví dụ không hợp lệ để phát âm.');
      return;
    }

    try {
      this.speechService.speakExample(example);
      this.toastService.success('Đang phát âm câu ví dụ...');
    } catch (error) {
      console.error('Error speaking example:', error);
      this.toastService.error('Không thể phát âm câu ví dụ này.');
    }
  }

  /**
   * Dừng phát âm hiện tại
   */
  stopSpeaking() {
    this.speechService.stop();
  }

  /**
   * Kiểm tra có đang phát âm không
   */
  isSpeaking(): boolean {
    return this.speechService.isSpeaking();
  }

  // Các hàm helper để hiển thị trên giao diện
  getCategoryIcon(categoryId: string): string { return this.categories.find(c => c.id === categoryId)?.icon || '📝'; }
  getCategoryName(categoryId: string): string { return this.categories.find(c => c.id === categoryId)?.name || categoryId; }
  getCategoryColor(categoryId: string): string { return this.categories.find(c => c.id === categoryId)?.color || 'gray'; }
  getTotalStats(): number { return this.stats.reduce((total, stat) => total + stat.total, 0); }

  getDifficultyClass(difficulty: string): string {
    switch (difficulty) {
      case 'Beginner': return 'difficulty-beginner';
      case 'Intermediate': return 'difficulty-intermediate';
      case 'Advanced': return 'difficulty-advanced';
      default: return 'difficulty-beginner';
    }
  }

  getPartOfSpeechClass(partOfSpeech: string): string {
    switch (partOfSpeech.toLowerCase()) {
      case 'noun': return 'pos-noun';
      case 'verb': return 'pos-verb';
      case 'adjective': return 'pos-adjective';
      case 'adverb': return 'pos-adverb';
      default: return 'pos-other';
    }
  }
}