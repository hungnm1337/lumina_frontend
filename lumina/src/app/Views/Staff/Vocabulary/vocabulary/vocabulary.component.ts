// src/app/components/staff/vocabulary/vocabulary.component.ts

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
  // ----- TRẠNG THÁI GIAO DIỆN -----
  currentView: 'lists' | 'words' = 'lists';
  selectedList: VocabularyListResponse | null = null;

  // ----- DỮ LIỆU -----
  vocabularies: Vocabulary[] = [];
  filteredVocabularies: Vocabulary[] = [];
  vocabularyLists: VocabularyListResponse[] = [];
  stats: VocabularyStats[] = [];

  // ----- TRẠNG THÁI BỘ LỌC VÀ TÌM KIẾM -----
  searchTerm = '';

  // ----- TRẠNG THÁI MODAL TẠO TỪ VỰNG -----
  isModalOpen = false;
  editingVocabulary: Vocabulary | null = null;
  vocabularyForm: FormGroup;

  // ----- TRẠNG THÁI MODAL TẠO DANH SÁCH -----
  isListModalOpen = false;
  listForm: FormGroup;

  // ----- TRẠNG THÁI KHÁC -----
  isLoading = false;
  isSubmitting = false;

  // ----- DỮ LIỆU TĨNH -----
  categories: VocabularyCategory[] = [
    { id: 'business', name: 'Business', icon: '💼', count: 0, color: 'blue' },
    { id: 'technology', name: 'Technology', icon: '💻', count: 0, color: 'purple' },
    { id: 'travel', name: 'Travel', icon: '✈️', count: 0, color: 'green' },
    { id: 'health', name: 'Health', icon: '🏥', count: 0, color: 'red' },
    { id: 'finance', name: 'Finance', icon: '💰', count: 0, color: 'orange' },
    { id: 'education', name: 'Education', icon: '🎓', count: 0, color: 'indigo' }
  ];
  partsOfSpeech = ['Noun', 'Verb', 'Adjective', 'Adverb', 'Preposition', 'Conjunction', 'Phrasal Verb'];
  
  // ----- PHÂN TRANG -----
  page: number = 1;
  pageSize: number = 5;
  totalItems: number = 0;
  totalPages: number = 0;

  constructor(
    private fb: FormBuilder,
    private vocabularyService: VocabularyService,
    private toastService: ToastService,
    private speechService: SpeechService
  ) {
    // Form cho việc thêm/sửa từ vựng
    this.vocabularyForm = this.fb.group({
      word: ['', Validators.required],
      category: ['', Validators.required],
      partOfSpeech: ['', Validators.required],
      definition: ['', Validators.required],
      example: ['', Validators.required],
      translation: ['', Validators.required]
    });

    // Form cho việc tạo danh sách mới
    this.listForm = this.fb.group({
      name: ['', [Validators.required, Validators.maxLength(100)]],
      isPublic: [false]
    });
  }

  ngOnInit() {
    this.loadVocabularyLists();
  }

  // ----- QUẢN LÝ GIAO DIỆN -----
  selectList(list: VocabularyListResponse) {
    this.selectedList = list;
    this.currentView = 'words';
    this.loadVocabularies(list.vocabularyListId);
  }

  showListView() {
    this.currentView = 'lists';
    this.selectedList = null;
    this.vocabularies = [];
    this.filteredVocabularies = [];
    this.searchTerm = '';
    this.loadVocabularyLists();
  }

  // ----- TẢI DỮ LIỆU -----
  loadVocabularyLists() {
    this.isLoading = true;
    this.vocabularyService.getVocabularyLists(this.searchTerm).subscribe({
      next: (lists) => { this.vocabularyLists = lists; this.isLoading = false; },
      error: (error) => { this.toastService.error('Không thể tải danh sách từ điển'); this.isLoading = false; }
    });
  }

  loadVocabularies(listId: number) {
    this.isLoading = true;
    this.vocabularyService.getVocabularies(listId, this.searchTerm).subscribe({
        next: (vocabularies) => {
            this.vocabularies = vocabularies.map(v => this.vocabularyService.convertToVocabulary(v));
            this.filterVocabularies();
            this.isLoading = false;
        },
        error: (error) => { this.toastService.error('Không thể tải danh sách từ vựng'); this.isLoading = false; }
    });
  }

  // ----- TÌM KIẾM & LỌC -----
  filterVocabularies() {
    this.filteredVocabularies = this.vocabularies.filter(vocab =>
      vocab.word.toLowerCase().includes(this.searchTerm.toLowerCase()) ||
      vocab.definition.toLowerCase().includes(this.searchTerm.toLowerCase())
    );
    this.page = 1;
    this.updatePagination();
  }

  onSearchChange() {
    if (this.currentView === 'lists') {
      this.loadVocabularyLists();
    } else if (this.currentView === 'words' && this.selectedList) {
      this.loadVocabularies(this.selectedList.vocabularyListId);
    }
  }

  clearSearch() {
    this.searchTerm = '';
    this.onSearchChange();
  }

  // ----- MODAL DANH SÁCH -----
  openCreateListModal() { this.isListModalOpen = true; this.listForm.reset({ isPublic: false }); }
  closeCreateListModal() { this.isListModalOpen = false; }
  saveNewList() {
    if (this.listForm.invalid || this.isSubmitting) return;
    this.isSubmitting = true;
    this.vocabularyService.createVocabularyList(this.listForm.value).subscribe({
      next: (newList) => {
        this.toastService.success(`Đã tạo danh sách "${newList.name}"!`);
        this.isSubmitting = false; this.closeCreateListModal(); this.loadVocabularyLists();
      },
      error: (err) => { this.toastService.error("Tạo danh sách thất bại."); this.isSubmitting = false; }
    });
  }

  // ----- MODAL TỪ VỰNG (CRUD) -----
  openModal(vocabulary: Vocabulary | null = null) {
    this.editingVocabulary = vocabulary;
    this.isModalOpen = true;
    if (vocabulary) {
      // Dùng patchValue để điền dữ liệu vào form khi chỉnh sửa
      this.vocabularyForm.patchValue(vocabulary);
    } else {
      // Reset form khi tạo mới
      this.vocabularyForm.reset();
    }
  }

  closeModal() {
    this.isModalOpen = false;
    this.editingVocabulary = null;
  }
  
  saveVocabulary() {
    console.log('saveVocabulary called');
    console.log('Form valid:', this.vocabularyForm.valid);
    console.log('Form errors:', this.vocabularyForm.errors);
    console.log('Form value:', this.vocabularyForm.value);
    console.log('isSubmitting:', this.isSubmitting);
    console.log('selectedList:', this.selectedList);
    
    if (this.vocabularyForm.invalid || this.isSubmitting || !this.selectedList) {
      if (!this.selectedList) {
        this.toastService.error("Lỗi: Không có danh sách nào được chọn.");
        return;
      }
      if (this.vocabularyForm.invalid) {
        this.toastService.error("Vui lòng điền đầy đủ thông tin bắt buộc.");
        return;
      }
      return;
    }
    
    this.isSubmitting = true;
    const formData = this.vocabularyForm.value;
    console.log('Form data to submit:', formData);

    // Logic cho CHỈNH SỬA
    if (this.editingVocabulary) {
      const updateData = {
        word: formData.word, typeOfWord: formData.partOfSpeech, category: formData.category,
        definition: formData.definition, example: formData.example
      };
      console.log('Updating vocabulary:', updateData);
      this.vocabularyService.updateVocabulary(this.editingVocabulary.id, updateData).subscribe({
        next: () => {
          this.toastService.success('Cập nhật từ vựng thành công!');
          this.loadVocabularies(this.selectedList!.vocabularyListId);
          this.closeModal();
          this.isSubmitting = false;
        },
        error: (error) => { 
          console.error('Update vocabulary error:', error);
          this.isSubmitting = false; 
          this.toastService.error("Cập nhật thất bại."); 
        }
      });
    } 
    // Logic cho TẠO MỚI
    else {
      const vocabularyData = {
        vocabularyListId: this.selectedList.vocabularyListId, word: formData.word,
        typeOfWord: formData.partOfSpeech, category: formData.category,
        definition: formData.definition, example: formData.example
      };
      console.log('Creating vocabulary:', vocabularyData);
      this.vocabularyService.createVocabulary(vocabularyData).subscribe({
        next: () => {
          this.toastService.success('Tạo từ vựng thành công!');
          this.loadVocabularies(this.selectedList!.vocabularyListId);
          this.closeModal();
          this.isSubmitting = false;
        },
        error: (error) => { 
          console.error('Create vocabulary error:', error);
          this.isSubmitting = false; 
          this.toastService.error("Tạo từ vựng thất bại."); 
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
          if (this.selectedList) this.loadVocabularies(this.selectedList.vocabularyListId);
        },
        error: (error) => { this.toastService.error('Không thể xóa từ vựng.'); this.isLoading = false; }
      });
    }
  }

  // ----- PHÂN TRANG -----
  get pagedVocabularies() { const start = (this.page - 1) * this.pageSize; return this.filteredVocabularies.slice(start, start + this.pageSize); }
  updatePagination() { this.totalItems = this.filteredVocabularies.length; this.totalPages = Math.ceil(this.totalItems / this.pageSize) || 1; if (this.page > this.totalPages) this.page = this.totalPages; }
  nextPage() { if (this.page < this.totalPages) this.page++; }
  prevPage() { if (this.page > 1) this.page--; }
  goToPage(pageNum: number) { this.page = pageNum; }
  
  getPageNumbers(): number[] {
    const pages: number[] = [];
    const maxVisiblePages = 5;
    const startPage = Math.max(1, this.page - Math.floor(maxVisiblePages / 2));
    const endPage = Math.min(this.totalPages, startPage + maxVisiblePages - 1);
    
    for (let i = startPage; i <= endPage; i++) {
      pages.push(i);
    }
    return pages;
  }
  
  getStartIndex(): number {
    return (this.page - 1) * this.pageSize + 1;
  }
  
  getEndIndex(): number {
    return Math.min(this.page * this.pageSize, this.totalItems);
  }

  // ----- HELPERS & TEXT-TO-SPEECH -----
  speakWord(word: string) { this.speechService.speakWord(word); }
  getCategoryName(categoryId: string): string { const category = this.categories.find(c => c.id === categoryId); return category?.name || categoryId; }
  getPartOfSpeechClass(partOfSpeech: string): string { const lower = partOfSpeech.toLowerCase(); if (lower.includes('verb')) return 'pos-verb'; if (lower.includes('noun')) return 'pos-noun'; return 'pos-other'; }

  
}