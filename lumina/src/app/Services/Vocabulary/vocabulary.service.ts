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


  getVocabularies(listId?: number, search?: string): Observable<VocabularyWord[]> {
    const token = localStorage.getItem('lumina_token');
    const headers = new HttpHeaders({
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json'
    });

    let params: any = {};
    if (listId) params.listId = listId.toString();
    if (search) params.search = search;

    
    return this.http.get<VocabularyWord[]>(`${this.apiUrl}/student-list`, { headers, params }).pipe(
      tap((data) => {
   
        console.log('🔍 API Response from /student-list:', data);
        if (Array.isArray(data) && data.length > 0) {
          console.log('🔍 First word from API:', data[0]);
          console.log('🔍 First word ID:', data[0]?.id, 'Type:', typeof data[0]?.id);
        }
      })
    );
  }

 
  createVocabulary(vocabularyData: {
    vocabularyListId: number;
    word: string;
    typeOfWord: string;
    definition: string;
    example?: string;
    category?: string; 
    imageUrl?: string; 
  }): Observable<any> {
    const token = localStorage.getItem('lumina_token');
    const headers = new HttpHeaders({
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json'
    });

    return this.http.post(this.apiUrl, vocabularyData, { headers });
  }

 
  getVocabularyById(id: number): Observable<VocabularyWord> {
    const token = localStorage.getItem('lumina_token');
    const headers = new HttpHeaders({
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json'
    });

    return this.http.get<VocabularyWord>(`${this.apiUrl}/${id}`, { headers });
  }


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


  deleteVocabulary(id: number): Observable<any> {
    const token = localStorage.getItem('lumina_token');
    const headers = new HttpHeaders({
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json'
    });

    return this.http.delete(`${this.apiUrl}/${id}`, { headers });
  }


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

  getVocabulariesByType(type: string): Observable<VocabularyWord[]> {
    const token = localStorage.getItem('lumina_token');
    const headers = new HttpHeaders({
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json'
    });

    return this.http.get<VocabularyWord[]>(`${this.apiUrl}/by-type/${type}`, { headers });
  }


  getVocabularyStats(): Observable<{totalCount: number, countsByList: VocabularyStats[]}> {
    const token = localStorage.getItem('lumina_token');
    const headers = new HttpHeaders({
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json'
    });

    return this.http.get<{totalCount: number, countsByList: VocabularyStats[]}>(`${this.apiUrl}/stats`, { headers });
  }

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

  createVocabularyList(listData: VocabularyListCreate): Observable<VocabularyListResponse> {
    const token = localStorage.getItem('lumina_token');
    const headers = new HttpHeaders({
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json'
    });

    return this.http.post<VocabularyListResponse>(this.vocabularyListsUrl, listData, { headers });
  }

  getVocabularyListDetail(id: number): Observable<any> {
    const token = localStorage.getItem('lumina_token');
    const headers = new HttpHeaders({
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json'
    });
    return this.http.get(`${this.vocabularyListsUrl}/${id}`, { headers });
  }

  deleteVocabularyList(id: number): Observable<any> {
    const token = localStorage.getItem('lumina_token');
    const headers = new HttpHeaders({
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json'
    });

    return this.http.delete(`${this.vocabularyListsUrl}/${id}`, { headers });
  }

 
  convertToVocabulary(vocabulary: VocabularyWord): Vocabulary {
    console.log('Converting vocabulary:', vocabulary);
    console.log('Category from API:', vocabulary.category);
    
   
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
      pronunciation: this.getPronunciation(vocabulary.word), 
      category: vocabulary.category || 'general', 
      partOfSpeech: vocabulary.type,
      definition: definition.trim(),
      example: vocabulary.example || '',
      translation: translation.trim(),
      difficulty: 'Intermediate' as 'Beginner' | 'Intermediate' | 'Advanced', 
      createdDate: new Date().toLocaleDateString('vi-VN'),
      createdBy: 'System', 
      status: 'active' as 'active' | 'inactive',    
      audioUrl: vocabulary.audioUrl,
      imageUrl: vocabulary.imageUrl 
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


  requestApproval(listId: number): Observable<any> {
    const token = localStorage.getItem('lumina_token');
    const headers = new HttpHeaders({
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json'
    });

    return this.http.post(`${this.vocabularyListsUrl}/${listId}/request-approval`, {}, { headers });
  }


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


  sendBackToStaff(listId: number): Observable<any> {
    const token = localStorage.getItem('lumina_token');
    const headers = new HttpHeaders({
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json'
    });

    return this.http.post(`${this.vocabularyListsUrl}/${listId}/send-back`, {}, { headers });
  }

  getPublicVocabularyLists(searchTerm?: string): Observable<VocabularyListResponse[]> {
    let params: any = {};
    if (searchTerm) {
      params.searchTerm = searchTerm;
    }
    
    return this.http.get<VocabularyListResponse[]>(`${this.vocabularyListsUrl}/public`, { params });
  }

  getPublicVocabularyByList(listId: number): Observable<any[]> {
    return this.http.get<any[]>(`${this.apiUrl}/public/${listId}`);
  }

  saveQuizResult(result: QuizResultRequest): Observable<any> {
    const token = localStorage.getItem('lumina_token');
    const headers = new HttpHeaders({
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json'
    });
    
    return this.http.post(`${environment.apiUrl}/spaced-repetition/quiz/save-result`, result, { headers });
  }

 
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
