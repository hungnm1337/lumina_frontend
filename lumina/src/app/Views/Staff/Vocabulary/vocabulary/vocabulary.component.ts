import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule, ReactiveFormsModule, FormBuilder, FormGroup, Validators } from '@angular/forms';
import { Router } from '@angular/router';
import { VocabularyService } from '../../../../Services/Vocabulary/vocabulary.service';
import { ToastService } from '../../../../Services/Toast/toast.service';
import { 
  VocabularyWord,
  VocabularyListResponse,
  Vocabulary,
  VocabularyCategory,
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
    { id: 'business', name: 'Business', icon: '💼', count: 567, color: 'blue' },
    { id: 'technology', name: 'Technology', icon: '💻', count: 423, color: 'purple' },
    { id: 'travel', name: 'Travel', icon: '✈️', count: 298, color: 'green' },
    { id: 'health', name: 'Health', icon: '🏥', count: 234, color: 'red' },
    { id: 'finance', name: 'Finance', icon: '💰', count: 189, color: 'orange' },
    { id: 'education', name: 'Education', icon: '🎓', count: 156, color: 'indigo' }
  ];

  // Phân trang
page: number = 1;
pageSize: number = 5; // số item mỗi trang
totalItems: number = 0;
totalPages: number = 0;

// Lấy danh sách sau khi phân trang
get pagedVocabularies() {
  const start = (this.page - 1) * this.pageSize;
  return this.filteredVocabularies.slice(start, start + this.pageSize);
}

// Cập nhật lại số trang mỗi khi lọc/search thay đổi
updatePagination() {
  this.totalItems = this.filteredVocabularies.length;
  this.totalPages = Math.ceil(this.totalItems / this.pageSize) || 1;
  if (this.page > this.totalPages) {
    this.page = this.totalPages;
  }
}

// Sang trang sau
nextPage() {
  if (this.page < this.totalPages) {
    this.page++;
  }
}

// Trở về trang trước
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
    private toastService: ToastService
  ) {
    this.vocabularyForm = this.fb.group({
      word: ['', [Validators.required, Validators.minLength(2)]],
      pronunciation: ['', Validators.required],
      category: ['', Validators.required],
      partOfSpeech: ['', Validators.required],
      definition: ['', [Validators.required, Validators.minLength(10)]],
      example: ['', [Validators.required, Validators.minLength(10)]],
      translation: ['', [Validators.required, Validators.minLength(5)]],
      difficulty: ['', Validators.required]
    });
  }

  ngOnInit() {
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
        this.updateCategoryCounts();
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

  updateCategoryCounts() {
    // Update category counts based on stats
    this.stats.forEach(stat => {
      const category = this.categories.find(c => c.id === `list-${stat.listId}`);
      if (category) {
        category.count = stat.total;
      }
    });
  }

  loadSampleData() {
    this.vocabularies = [
      {
        id: 1,
        word: 'accomplish',
        pronunciation: '/əˈkʌmplɪʃ/',
        category: 'business',
        partOfSpeech: 'Verb',
        definition: 'to succeed in finishing something or reaching an aim, especially after a lot of work or effort',
        example: 'She accomplished her goals ahead of schedule.',
        translation: 'hoàn thành, đạt được, thực hiện thành công',
        difficulty: 'Intermediate',
        createdDate: '15/12/2024',
        createdBy: 'Nguyễn Văn A',
        status: 'active'
      },
      {
        id: 2,
        word: 'efficient',
        pronunciation: '/ɪˈfɪʃənt/',
        category: 'technology',
        partOfSpeech: 'Adjective',
        definition: 'working or operating in a well-organized way',
        example: 'The new system is more efficient than the old one.',
        translation: 'hiệu quả, có năng suất cao',
        difficulty: 'Intermediate',
        createdDate: '14/12/2024',
        createdBy: 'Trần Thị B',
        status: 'active'
      },
      {
        id: 3,
        word: 'destination',
        pronunciation: '/ˌdestɪˈneɪʃən/',
        category: 'travel',
        partOfSpeech: 'Noun',
        definition: 'the place to which someone or something is going or being sent',
        example: 'The plane arrived at its destination on time.',
        translation: 'điểm đến, đích đến',
        difficulty: 'Beginner',
        createdDate: '13/12/2024',
        createdBy: 'Lê Văn C',
        status: 'active'
      },
      {
        id: 4,
        word: 'physician',
        pronunciation: '/fɪˈzɪʃən/',
        category: 'health',
        partOfSpeech: 'Noun',
        definition: 'a medical doctor, especially one who has general skill and is not a surgeon',
        example: 'The physician examined the patient carefully.',
        translation: 'bác sĩ, thầy thuốc',
        difficulty: 'Advanced',
        createdDate: '12/12/2024',
        createdBy: 'Phạm Thị D',
        status: 'active'
      },
      {
        id: 5,
        word: 'revenue',
        pronunciation: '/ˈrevənju/',
        category: 'finance',
        partOfSpeech: 'Noun',
        definition: 'the income that a government or company receives regularly',
        example: 'The company\'s revenue increased by 15% this quarter.',
        translation: 'doanh thu, thu nhập',
        difficulty: 'Advanced',
        createdDate: '11/12/2024',
        createdBy: 'Hoàng Văn E',
        status: 'active'
      }
    ];
    this.filteredVocabularies = [...this.vocabularies];
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

  // ✅ reset về trang 1 mỗi khi dữ liệu lọc thay đổi
  this.page = 1;
  // ✅ tính lại tổng trang/tổng item
  this.updatePagination();


  }

  onSearchChange() {
    // Debounce search để tránh gọi API quá nhiều
    if (this.searchTerm.trim().length >= 2) {
      this.performSearch();
    } else if (this.searchTerm.trim().length === 0) {
      this.loadVocabularies();
    }
  }

  performSearch() {
    this.isLoading = true;
    const listId = this.selectedList ? parseInt(this.selectedList) : undefined;
    
    this.vocabularyService.searchVocabularies(this.searchTerm, listId).subscribe({
      next: (vocabularies) => {
        this.vocabularies = vocabularies.map(v => this.vocabularyService.convertToVocabulary(v));
        this.filterVocabularies();
        this.isLoading = false;
      },
      error: (error) => {
        console.error('Error searching vocabularies:', error);
        this.toastService.error('Không thể tìm kiếm từ vựng');
        this.isLoading = false;
      }
    });
  }

  onCategoryChange() {
    this.filterVocabularies();
  }

  onListChange() {
    if (this.selectedList) {
      this.loadVocabularies(parseInt(this.selectedList));
    } else {
      this.loadVocabularies();
    }
  }

  onDifficultyChange() {
    this.filterVocabularies();
  }

  onPartOfSpeechChange() {
    if (this.selectedPartOfSpeech) {
      this.loadVocabulariesByType();
    } else {
      this.loadVocabularies();
    }
  }

  loadVocabulariesByType() {
    this.isLoading = true;
    
    this.vocabularyService.getVocabulariesByType(this.selectedPartOfSpeech).subscribe({
      next: (vocabularies) => {
        this.vocabularies = vocabularies.map(v => this.vocabularyService.convertToVocabulary(v));
        this.filterVocabularies();
        this.isLoading = false;
      },
      error: (error) => {
        console.error('Error loading vocabularies by type:', error);
        this.toastService.error('Không thể tải từ vựng theo loại');
        this.isLoading = false;
      }
    });
  }

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
    if (this.vocabularyForm.valid && !this.isSubmitting) {
      this.isSubmitting = true;
      const formData = this.vocabularyForm.value;
      
      if (this.editingVocabulary) {
        // Cập nhật từ vựng
        const updateData = {
          word: formData.word,
          typeOfWord: formData.partOfSpeech,
          definition: formData.definition,
          example: formData.example || undefined
        };

        this.vocabularyService.updateVocabulary(this.editingVocabulary.id, updateData).subscribe({
          next: () => {
            this.toastService.success('Cập nhật từ vựng thành công!');
            // Reload data
            this.loadVocabularies();
            this.loadStats();
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
        // Create new vocabulary
        // Tạo từ vựng mới qua API
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
            // Reload data
            this.loadVocabularies();
            this.loadStats();
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
  }

  deleteVocabulary(id: number) {
    if (confirm('Bạn có chắc chắn muốn xóa từ vựng này?')) {
      this.isLoading = true;
      
      this.vocabularyService.deleteVocabulary(id).subscribe({
        next: () => {
          this.toastService.success('Xóa từ vựng thành công!');
          // Reload data
          this.loadVocabularies();
          this.loadStats();
          this.isLoading = false;
        },
        error: (error) => {
          console.error('Error deleting vocabulary:', error);
          this.toastService.error('Không thể xóa từ vựng. Vui lòng thử lại.');
          this.isLoading = false;
        }
      });
    }
  }

  toggleStatus(id: number) {
    const vocabulary = this.vocabularies.find(v => v.id === id);
    if (vocabulary) {
      vocabulary.status = vocabulary.status === 'active' ? 'inactive' : 'active';
      this.filterVocabularies();
    }
  }

  updateCategoryCount(categoryId: string, change: number) {
    const category = this.categories.find(c => c.id === categoryId);
    if (category) {
      category.count += change;
    }
  }

  getCategoryIcon(categoryId: string): string {
    const category = this.categories.find(c => c.id === categoryId);
    return category ? category.icon : '📝';
  }

  getCategoryName(categoryId: string): string {
    const category = this.categories.find(c => c.id === categoryId);
    return category ? category.name : categoryId;
  }

  getCategoryColor(categoryId: string): string {
    const category = this.categories.find(c => c.id === categoryId);
    return category ? category.color : 'gray';
  }

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

  getTotalVocabularies(): number {
    return this.vocabularies.length;
  }

  getTotalStats(): number {
    return this.stats.reduce((total, stat) => total + stat.total, 0);
  }

  playPronunciation(word: string) {
    // Placeholder for text-to-speech functionality
    console.log(`Playing pronunciation for: ${word}`);
  }

  clearSearch() {
    this.searchTerm = '';
    this.loadVocabularies();
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
    this.loadData();
  }
}
