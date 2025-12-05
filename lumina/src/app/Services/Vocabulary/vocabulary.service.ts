import { Injectable } from '@angular/core';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { Observable } from 'rxjs';
import { tap } from 'rxjs/operators';
import { environment } from '../../../environments/environment.development';
import { 
  VocabularyWord,
  VocabularyListCreate,
  VocabularyListResponse,
  VocabularyStats,
  Vocabulary,
  VocabularyCategory,
  QuizResultRequest
} from '../../Interfaces/vocabulary.interfaces';

@Injectable({
  providedIn: 'root'
})
export class VocabularyService {
  private apiUrl = `${environment.apiUrl}/vocabularies`;
  private vocabularyListsUrl = `${environment.apiUrl}/vocabulary-lists`;

  constructor(private http: HttpClient) {}

  // Lấy danh sách từ vựng
  getVocabularies(listId?: number, search?: string): Observable<VocabularyWord[]> {
    const token = localStorage.getItem('lumina_token');
    const headers = new HttpHeaders({
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json'
    });

    let params: any = {};
    if (listId) params.listId = listId.toString();
    if (search) params.search = search;

    // Sử dụng endpoint student-list để hỗ trợ cả Student và Staff
    return this.http.get<VocabularyWord[]>(`${this.apiUrl}/student-list`, { headers, params }).pipe(
      tap((data) => {
        // Debug: log response để kiểm tra
        console.log('🔍 API Response from /student-list:', data);
        if (Array.isArray(data) && data.length > 0) {
          console.log('🔍 First word from API:', data[0]);
          console.log('🔍 First word ID:', data[0]?.id, 'Type:', typeof data[0]?.id);
        }
      })
    );
  }

  // Tạo từ vựng mới
  createVocabulary(vocabularyData: {
    vocabularyListId: number;
    word: string;
    typeOfWord: string;
    definition: string;
    example?: string;
    category?: string; // Loại từ
    imageUrl?: string; // URL ảnh từ Cloudinary
  }): Observable<any> {
    const token = localStorage.getItem('lumina_token');
    const headers = new HttpHeaders({
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json'
    });

    return this.http.post(this.apiUrl, vocabularyData, { headers });
  }

  // Lấy từ vựng theo ID
  getVocabularyById(id: number): Observable<VocabularyWord> {
    const token = localStorage.getItem('lumina_token');
    const headers = new HttpHeaders({
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json'
    });

    return this.http.get<VocabularyWord>(`${this.apiUrl}/${id}`, { headers });
  }

  // Cập nhật từ vựng
  updateVocabulary(id: number, vocabularyData: {
    word: string;
    typeOfWord: string;
    definition: string;
    category?: string;
    example?: string;
    imageUrl?: string;
  }): Observable<any> {
    const token = localStorage.getItem('lumina_token');
    const headers = new HttpHeaders({
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json'
    });

    return this.http.put(`${this.apiUrl}/${id}`, vocabularyData, { headers });
  }

  // Xóa từ vựng
  deleteVocabulary(id: number): Observable<any> {
    const token = localStorage.getItem('lumina_token');
    const headers = new HttpHeaders({
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json'
    });

    return this.http.delete(`${this.apiUrl}/${id}`, { headers });
  }

  // Tìm kiếm từ vựng
  searchVocabularies(term: string, listId?: number): Observable<VocabularyWord[]> {
    const token = localStorage.getItem('lumina_token');
    const headers = new HttpHeaders({
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json'
    });

    let params: any = { term };
    if (listId) {
      params.listId = listId.toString();
    }

    return this.http.get<VocabularyWord[]>(`${this.apiUrl}/search`, { headers, params });
  }

  // Lấy từ vựng theo loại từ
  getVocabulariesByType(type: string): Observable<VocabularyWord[]> {
    const token = localStorage.getItem('lumina_token');
    const headers = new HttpHeaders({
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json'
    });

    return this.http.get<VocabularyWord[]>(`${this.apiUrl}/by-type/${type}`, { headers });
  }

  // Lấy thống kê từ vựng
  getVocabularyStats(): Observable<{totalCount: number, countsByList: VocabularyStats[]}> {
    const token = localStorage.getItem('lumina_token');
    const headers = new HttpHeaders({
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json'
    });

    return this.http.get<{totalCount: number, countsByList: VocabularyStats[]}>(`${this.apiUrl}/stats`, { headers });
  }

  // === VOCABULARY LISTS ===
  
  // Lấy danh sách vocabulary lists
  getVocabularyLists(searchTerm?: string): Observable<VocabularyListResponse[]> {
    const token = localStorage.getItem('lumina_token');
    const headers = new HttpHeaders({
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json'
    });

    let params: any = {};
    if (searchTerm) {
      params.searchTerm = searchTerm;
    }
    
    return this.http.get<VocabularyListResponse[]>(this.vocabularyListsUrl, { headers, params });
  }

  // Lấy danh sách vocabulary lists của chính người dùng (mọi role)
  getMyVocabularyLists(searchTerm?: string): Observable<VocabularyListResponse[]> {
    const token = localStorage.getItem('lumina_token');
    const headers = new HttpHeaders({
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json'
    });

    let params: any = {};
    if (searchTerm) {
      params.searchTerm = searchTerm;
    }

    return this.http.get<VocabularyListResponse[]>(`${this.vocabularyListsUrl}/my`, { headers, params });
  }

  // Lấy danh sách vocabulary lists của user hiện tại + folder của staff (cho Flashcards)
  getMyAndStaffVocabularyLists(searchTerm?: string): Observable<VocabularyListResponse[]> {
    const token = localStorage.getItem('lumina_token');
    const headers = new HttpHeaders({
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json'
    });

    let params: any = {};
    if (searchTerm) {
      params.searchTerm = searchTerm;
    }

    return this.http.get<VocabularyListResponse[]>(`${this.vocabularyListsUrl}/my-and-staff`, { headers, params });
  }

  // Tạo vocabulary list mới
  createVocabularyList(listData: VocabularyListCreate): Observable<VocabularyListResponse> {
    const token = localStorage.getItem('lumina_token');
    const headers = new HttpHeaders({
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json'
    });

    return this.http.post<VocabularyListResponse>(this.vocabularyListsUrl, listData, { headers });
  }

  // Lấy chi tiết một vocabulary list (bao gồm mảng words)
  getVocabularyListDetail(id: number): Observable<any> {
    const token = localStorage.getItem('lumina_token');
    const headers = new HttpHeaders({
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json'
    });
    // tuỳ vào backend nên dùng endpoint GET /vocabulary-lists/{id}
    return this.http.get(`${this.vocabularyListsUrl}/${id}`, { headers });
  }

  // Xóa vocabulary list
  deleteVocabularyList(id: number): Observable<any> {
    const token = localStorage.getItem('lumina_token');
    const headers = new HttpHeaders({
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json'
    });

    return this.http.delete(`${this.vocabularyListsUrl}/${id}`, { headers });
  }

  // Helper method để convert VocabularyWord thành Vocabulary (cho UI)
  convertToVocabulary(vocabulary: VocabularyWord): Vocabulary {
    console.log('Converting vocabulary:', vocabulary);
    console.log('Category from API:', vocabulary.category);
    
    // Tách definition và translation nếu có format "DEFINITION|||TRANSLATION"
    let definition = vocabulary.definition;
    let translation = vocabulary.definition;
    
    if (vocabulary.definition.includes('|||')) {
      const parts = vocabulary.definition.split('|||');
      definition = parts[0] || vocabulary.definition;
      translation = parts[1] || vocabulary.definition;
    }
    
    const converted = {
      id: vocabulary.id,
      word: vocabulary.word,
      pronunciation: this.getPronunciation(vocabulary.word), // Tự động tạo phiên âm
      category: vocabulary.category || 'general', // Sử dụng category từ API hoặc default
      partOfSpeech: vocabulary.type,
      definition: definition.trim(),
      example: vocabulary.example || '',
      translation: translation.trim(),
      difficulty: 'Intermediate' as 'Beginner' | 'Intermediate' | 'Advanced', // Default difficulty
      createdDate: new Date().toLocaleDateString('vi-VN'),
      createdBy: 'System', // Default creator
      status: 'active' as 'active' | 'inactive', // Default status
      audioUrl: vocabulary.audioUrl,
      imageUrl: vocabulary.imageUrl // Map imageUrl từ VocabularyWord sang Vocabulary
    };
    
    console.log('Converted result:', converted);
    return converted;
  }

  // Tự động tạo phiên âm cho từ
  private getPronunciation(word: string): string {
    const dict: { [key: string]: string } = {
      'carbon': '/ˈkɑːbən/',
      'footprint': '/ˈfʊtprɪnt/',
      'flying': '/ˈflaɪɪŋ/',
      'significant': '/sɪɡˈnɪfɪkənt/',
      'impact': '/ˈɪmpækt/',
      'atmosphere': '/ˈætməsfɪə/',
      'dioxide': '/daɪˈɒksaɪd/',
      'amount': '/əˈmaʊnt/',
      'released': '/rɪˈliːst/'
    };
    return dict[word.toLowerCase()] || `/${word.toLowerCase()}/`;
  }

  // Helper method để convert Vocabulary thành VocabularyWord format (cho API)
  convertToVocabularyWord(vocabulary: Vocabulary, listId: number): {
    vocabularyListId: number;
    word: string;
    typeOfWord: string;
    definition: string;
    example?: string;
  } {
    return {
      vocabularyListId: listId,
      word: vocabulary.word,
      typeOfWord: vocabulary.partOfSpeech,
      definition: vocabulary.definition,
      example: vocabulary.example || undefined
    };
  }

  // Gửi yêu cầu phê duyệt vocabulary list
  requestApproval(listId: number): Observable<any> {
    const token = localStorage.getItem('lumina_token');
    const headers = new HttpHeaders({
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json'
    });

    return this.http.post(`${this.vocabularyListsUrl}/${listId}/request-approval`, {}, { headers });
  }

  // Duyệt/từ chối vocabulary list (Manager only)
  reviewVocabularyList(listId: number, reviewData: {
    isApproved: boolean;
    comment?: string;
  }): Observable<any> {
    const token = localStorage.getItem('lumina_token');
    const headers = new HttpHeaders({
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json'
    });

    return this.http.post(`${this.vocabularyListsUrl}/${listId}/review`, reviewData, { headers });
  }

  // Gửi lại vocabulary list về staff để chỉnh sửa (Manager only)
  sendBackToStaff(listId: number): Observable<any> {
    const token = localStorage.getItem('lumina_token');
    const headers = new HttpHeaders({
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json'
    });

    return this.http.post(`${this.vocabularyListsUrl}/${listId}/send-back`, {}, { headers });
  }

  // === PUBLIC API FOR FLASHCARDS ===
  
  // Lấy danh sách vocabulary lists đã được duyệt cho trang Flashcards
  getPublicVocabularyLists(searchTerm?: string): Observable<VocabularyListResponse[]> {
    let params: any = {};
    if (searchTerm) {
      params.searchTerm = searchTerm;
    }
    
    return this.http.get<VocabularyListResponse[]>(`${this.vocabularyListsUrl}/public`, { params });
  }

  // Lấy vocabulary words từ một published list cho Flashcards
  getPublicVocabularyByList(listId: number): Observable<any[]> {
    return this.http.get<any[]>(`${this.apiUrl}/public/${listId}`);
  }

  // === QUIZ SCORES ===
  
  // Lưu quiz result
  saveQuizResult(result: QuizResultRequest): Observable<any> {
    const token = localStorage.getItem('lumina_token');
    const headers = new HttpHeaders({
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json'
    });
    
    return this.http.post(`${environment.apiUrl}/spaced-repetition/quiz/save-result`, result, { headers });
  }

  // Lấy quiz scores
  getQuizScores(vocabularyListId?: number): Observable<any[]> {
    const token = localStorage.getItem('lumina_token');
    const headers = new HttpHeaders({
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json'
    });
    
    let params: any = {};
    if (vocabularyListId) {
      params.vocabularyListId = vocabularyListId.toString();
    }
    
    return this.http.get<any[]>(`${environment.apiUrl}/spaced-repetition/quiz/scores`, { headers, params });
  }
}
