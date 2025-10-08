# 🎙️ Hướng Dẫn Sử Dụng Tính Năng Speaking

## 📋 Tổng Quan

Tính năng Speaking cho phép người dùng:

- Ghi âm câu trả lời speaking qua microphone
- Tự động chấm điểm thông qua Azure AI Speech + Python NLP Service
- Xem kết quả chi tiết với breakdown các tiêu chí
- Nghe lại bản ghi âm đã submit

## 🏗️ Kiến Trúc

### Backend (C# .NET) - ✅ ĐÃ HOÀN THÀNH

- **Endpoint**: `POST /api/Speaking/submit-answer`
- **Flow**:
  1. Upload audio lên Cloudinary
  2. Chuyển đổi sang MP3 16kHz
  3. Gọi Azure Speech API (phát âm, độ trôi chảy, accuracy...)
  4. Gọi Python NLP Service (ngữ pháp, từ vựng, nội dung)
  5. Tính điểm tổng hợp (weighted average)
  6. Lưu vào DB và trả kết quả

### Frontend (Angular 18) - ✅ ĐÃ HOÀN THÀNH

#### 1. **SpeakingAnswerBoxComponent** (Mới tạo)

**Location**: `src/app/Views/User/speaking-answer-box/`

**Features**:

- MediaRecorder API để ghi âm
- UI với 5 trạng thái:
  - `idle`: Sẵn sàng ghi âm
  - `recording`: Đang ghi âm (hiển thị timer, animation)
  - `processing`: Đang chấm điểm (loading spinner)
  - `completed`: Hiển thị kết quả chi tiết
  - `error`: Hiển thị lỗi

**Inputs**:

- `questionId: number` - ID câu hỏi
- `disabled: boolean` - Disable component
- `resetAt: number` - Trigger reset khi thay đổi

**Outputs**:

- `answered: EventEmitter<boolean>` - Emit khi submit xong
- `scoringResult: EventEmitter<SpeakingScoringResult>` - Emit kết quả chấm điểm

**Chức năng chính**:

```typescript
startRecording(); // Bắt đầu ghi âm
stopRecording(); // Dừng ghi âm
submitRecording(); // Nộp bài và chấm điểm
cancelRecording(); // Hủy và ghi lại
```

#### 2. **QuestionComponent** (Đã cập nhật)

**Changes**:

- Import `SpeakingAnswerBoxComponent`
- Thêm method `onSpeakingResult(result)` để xử lý kết quả
- Tính điểm dựa trên `overallScore` (0-100) scale theo `scoreWeight`
- Lưu kết quả vào `speakingResults: Map<questionId, result>`

**Template**:

```html
@else if (questions[currentIndex].questionType === 'SPEAKING') {
<app-speaking-answer-box
  [questionId]="questions[currentIndex].questionId"
  [disabled]="showExplain"
  [resetAt]="currentIndex"
  (answered)="markAnswered($event)"
  (scoringResult)="onSpeakingResult($event)"
>
</app-speaking-answer-box>
}
```

#### 3. **Interfaces** (Đã cập nhật)

**Added to `exam.interfaces.ts`**:

```typescript
export interface SpeakingScoringResult {
  transcript: string;
  savedAudioUrl: string;
  overallScore: number;
  // Azure scores
  pronunciationScore: number;
  accuracyScore: number;
  fluencyScore: number;
  completenessScore: number;
  // NLP scores
  grammarScore: number;
  vocabularyScore: number;
  contentScore: number;
}
```

#### 4. **SpeakingService** (Đã có sẵn)

**Method**:

```typescript
submitSpeakingAnswer(audioBlob: Blob, questionId: number):
  Observable<SpeakingScoringResult>
```

## 🚀 Cách Sử Dụng

### 1. Tạo Câu Hỏi Speaking trong Database

Trong bảng `Question`, set:

- `questionType = 'SPEAKING'`
- `sampleAnswer` = câu trả lời mẫu (để so sánh nội dung)
- `stemText` = câu hỏi (VD: "Describe the picture", "What is your favorite...")

### 2. User Làm Bài

1. Chọn Part có câu hỏi SPEAKING
2. Component tự động hiển thị `SpeakingAnswerBoxComponent`
3. User click "Bắt đầu ghi âm"
4. Cho phép quyền truy cập microphone (browser sẽ hỏi)
5. Nói câu trả lời (tối đa 2 phút, auto-stop)
6. Click "Dừng ghi âm"
7. Click "Nộp bài"
8. Đợi xử lý (5-10 giây tùy độ dài audio)
9. Xem kết quả chi tiết

### 3. Kết Quả Hiển Thị

**Phần 1: Tổng điểm**

- OverallScore: 0-100

**Phần 2: Transcript**

- Nội dung user đã nói (ASR from Azure)

**Phần 3: Scores Breakdown**

- **Azure Scores** (Phát âm & Phát biểu):
  - Pronunciation
  - Accuracy
  - Fluency
  - Completeness
- **NLP Scores** (Ngữ pháp & Nội dung):
  - Grammar
  - Vocabulary
  - Content

**Phần 4: Audio Player**

- Nghe lại bản ghi từ Cloudinary

## ⚙️ Cấu Hình

### Backend Requirements

**appsettings.json**:

```json
{
  "CloudinarySettings": {
    "CloudName": "your-cloud-name",
    "ApiKey": "your-api-key",
    "ApiSecret": "your-api-secret"
  },
  "ServiceUrls": {
    "NlpService": "http://your-python-service-url"
  }
}
```

### Frontend Requirements

**environment.ts**:

```typescript
export const environment = {
  apiUrl: "https://localhost:7162/api",
};
```

**Dependencies**:

- `ngx-toastr` (đã có sẵn cho toast notifications)

## 🎯 Luồng Dữ Liệu

```
User clicks "Bắt đầu ghi âm"
  ↓
MediaRecorder starts (webm format)
  ↓
User clicks "Dừng ghi âm"
  ↓
audioBlob created
  ↓
User clicks "Nộp bài"
  ↓
SpeakingService.submitSpeakingAnswer(audioBlob, questionId)
  ↓
POST /api/Speaking/submit-answer (FormData: audio, questionId)
  ↓
Backend:
  1. Upload to Cloudinary → MP3 URL
  2. Azure Speech Analysis → pronunciation scores + transcript
  3. Python NLP → grammar/vocab/content scores
  4. Calculate overall score (weighted average)
  5. Save to DB (UserAnswer + SpeakingResult)
  ↓
Return SpeakingScoringResultDTO
  ↓
Component displays results
```

## 🔧 Troubleshooting

### Microphone không hoạt động

- **Browser permission**: Đảm bảo user cho phép quyền microphone
- **HTTPS required**: MediaRecorder chỉ hoạt động trên HTTPS (hoặc localhost)
- **Browser support**: Chrome/Edge/Firefox hiện đại

### Backend errors

- **Cloudinary upload failed**: Kiểm tra credentials trong appsettings.json
- **Azure Speech failed**: Kiểm tra Azure subscription key và region
- **NLP Service failed**: Kiểm tra Python service có đang chạy không

### Audio format issues

- Backend tự động convert sang MP3 16kHz qua Cloudinary
- Frontend gửi webm (hoặc format khác tùy browser support)

## 📝 TODO Improvements (Future)

- [ ] Thêm visualizer sóng âm khi recording
- [ ] Cho phép pause/resume khi recording
- [ ] Export kết quả ra PDF
- [ ] Lưu draft recordings vào localStorage
- [ ] Thêm practice mode (không tính điểm)
- [ ] So sánh với native speaker (audio sample)

## ✅ Testing Checklist

- [x] Component renders correctly
- [x] MediaRecorder API works
- [x] Audio recording và playback
- [x] Submit to backend successful
- [x] Results display properly
- [x] Error handling (mic permission denied)
- [x] Loading states
- [x] Reset functionality
- [ ] Cross-browser testing (Chrome, Firefox, Safari)
- [ ] Mobile responsive
- [ ] Performance optimization

## 📚 References

- [MediaRecorder API](https://developer.mozilla.org/en-US/docs/Web/API/MediaRecorder)
- [Azure Speech Pronunciation Assessment](https://learn.microsoft.com/en-us/azure/ai-services/speech-service/how-to-pronunciation-assessment)
- [Cloudinary Audio Transformation](https://cloudinary.com/documentation/audio_transformations)
