import { Injectable } from '@angular/core';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment.development';
import { 
  VocabularyWord,
  VocabularyListCreate,
  VocabularyListResponse,
  VocabularyStats,
  Vocabulary,
  VocabularyCategory
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

    return this.http.get<VocabularyWord[]>(this.apiUrl, { headers, params });
  }

  // Tạo từ vựng mới
  createVocabulary(vocabularyData: {
    vocabularyListId: number;
    word: string;
    typeOfWord: string;
    definition: string;
    example?: string;
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
    example?: string;
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

  // Tạo vocabulary list mới
  createVocabularyList(listData: VocabularyListCreate): Observable<VocabularyListResponse> {
    const token = localStorage.getItem('lumina_token');
    const headers = new HttpHeaders({
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json'
    });

    return this.http.post<VocabularyListResponse>(this.vocabularyListsUrl, listData, { headers });
  }

  // Helper method để convert VocabularyWord thành Vocabulary (cho UI)
  convertToVocabulary(vocabulary: VocabularyWord): Vocabulary {
    console.log('Converting vocabulary:', vocabulary);
    console.log('Category from API:', vocabulary.category);
    
    const converted = {
      id: vocabulary.id,
      word: vocabulary.word,
      pronunciation: this.getPronunciation(vocabulary.word), // Tự động tạo phiên âm
      category: vocabulary.category || 'general', // Sử dụng category từ API hoặc default
      partOfSpeech: vocabulary.type,
      definition: vocabulary.definition,
      example: vocabulary.example || '',
      translation: vocabulary.definition, // Dùng definition làm translation tạm
      difficulty: 'Intermediate' as 'Beginner' | 'Intermediate' | 'Advanced', // Default difficulty
      createdDate: new Date().toLocaleDateString('vi-VN'),
      createdBy: 'System', // Default creator
      status: 'active' as 'active' | 'inactive', // Default status
      audioUrl: vocabulary.audioUrl
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
}
