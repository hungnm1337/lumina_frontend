import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule, ReactiveFormsModule, FormBuilder, FormGroup, Validators } from '@angular/forms';
import { Router } from '@angular/router';

interface VocabularyWord {
  id: number;
  word: string;
  pronunciation: string;
  category: string;
  partOfSpeech: string;
  definition: string;
  example: string;
  translation: string;
  difficulty: 'Beginner' | 'Intermediate' | 'Advanced';
  createdDate: string;
  createdBy: string;
  status: 'active' | 'inactive';
}

interface VocabularyCategory {
  id: string;
  name: string;
  icon: string;
  count: number;
  color: string;
}

@Component({
  selector: 'app-vocabulary',
  standalone: true,
  imports: [CommonModule, FormsModule, ReactiveFormsModule],
  templateUrl: './vocabulary.component.html',
  styleUrls: ['./vocabulary.component.scss']
})
export class VocabularyComponent implements OnInit {
  vocabularies: VocabularyWord[] = [];
  filteredVocabularies: VocabularyWord[] = [];
  searchTerm = '';
  selectedCategory = '';
  selectedDifficulty = '';
  selectedPartOfSpeech = '';
  isModalOpen = false;
  editingVocabulary: VocabularyWord | null = null;
  vocabularyForm: FormGroup;

  categories: VocabularyCategory[] = [
    { id: 'business', name: 'Business', icon: '💼', count: 567, color: 'blue' },
    { id: 'technology', name: 'Technology', icon: '💻', count: 423, color: 'purple' },
    { id: 'travel', name: 'Travel', icon: '✈️', count: 298, color: 'green' },
    { id: 'health', name: 'Health', icon: '🏥', count: 234, color: 'red' },
    { id: 'finance', name: 'Finance', icon: '💰', count: 189, color: 'orange' },
    { id: 'education', name: 'Education', icon: '🎓', count: 156, color: 'indigo' }
  ];

  difficulties = ['Beginner', 'Intermediate', 'Advanced'];
  partsOfSpeech = ['Noun', 'Verb', 'Adjective', 'Adverb', 'Preposition', 'Conjunction'];

  constructor(private fb: FormBuilder, private router: Router) {
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
    this.loadSampleData();
  }

  ngOnInit() {
    this.filterVocabularies();
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
      const matchesSearch = vocab.word.toLowerCase().includes(this.searchTerm.toLowerCase()) ||
                           vocab.definition.toLowerCase().includes(this.searchTerm.toLowerCase()) ||
                           vocab.translation.toLowerCase().includes(this.searchTerm.toLowerCase());
      const matchesCategory = !this.selectedCategory || vocab.category === this.selectedCategory;
      const matchesDifficulty = !this.selectedDifficulty || vocab.difficulty === this.selectedDifficulty;
      const matchesPartOfSpeech = !this.selectedPartOfSpeech || vocab.partOfSpeech === this.selectedPartOfSpeech;
      
      return matchesSearch && matchesCategory && matchesDifficulty && matchesPartOfSpeech;
    });
  }

  onSearchChange() {
    this.filterVocabularies();
  }

  onCategoryChange() {
    this.filterVocabularies();
  }

  onDifficultyChange() {
    this.filterVocabularies();
  }

  onPartOfSpeechChange() {
    this.filterVocabularies();
  }

  openModal(vocabulary: VocabularyWord | null = null) {
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
    if (this.vocabularyForm.valid) {
      const formData = this.vocabularyForm.value;
      
      if (this.editingVocabulary) {
        // Update existing vocabulary
        const index = this.vocabularies.findIndex(v => v.id === this.editingVocabulary!.id);
        if (index !== -1) {
          this.vocabularies[index] = {
            ...this.vocabularies[index],
            ...formData
          };
        }
      } else {
        // Create new vocabulary
        const newVocabulary: VocabularyWord = {
          id: Math.max(...this.vocabularies.map(v => v.id)) + 1,
          ...formData,
          createdDate: new Date().toLocaleDateString('vi-VN'),
          createdBy: 'Current User',
          status: 'active'
        };
        this.vocabularies.push(newVocabulary);
        this.updateCategoryCount(formData.category, 1);
      }
      
      this.filterVocabularies();
      this.closeModal();
    }
  }

  deleteVocabulary(id: number) {
    if (confirm('Bạn có chắc chắn muốn xóa từ vựng này?')) {
      const vocabulary = this.vocabularies.find(v => v.id === id);
      if (vocabulary) {
        this.updateCategoryCount(vocabulary.category, -1);
      }
      this.vocabularies = this.vocabularies.filter(v => v.id !== id);
      this.filterVocabularies();
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
    return this.categories.reduce((total, category) => total + category.count, 0);
  }

  playPronunciation(word: string) {
    // Placeholder for text-to-speech functionality
    console.log(`Playing pronunciation for: ${word}`);
  }
}
