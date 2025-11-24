# Speaking Component - Bug Fixes Integration Guide

## Tổng quan

Document này hướng dẫn tích hợp các fix cho Speaking component để giải quyết các bug đã được phân tích.

## I. Services Mới Đã Tạo

### 1. OfflineStorageService (`offline-storage.service.ts`)

**Chức năng**: Quản lý lưu trữ offline sử dụng IndexedDB

**API chính**:
```typescript
// Lưu pending submission khi offline
savePendingSubmission(submission: PendingSpeakingSubmission): Promise<void>

// Lấy tất cả pending submissions
getPendingSubmissions(): Promise<PendingSpeakingSubmission[]>

// Xóa submission sau khi sync thành công
deletePendingSubmission(questionId: number): Promise<void>

// Lưu audio draft (để restore sau khi reload page)
saveAudioDraft(questionId: number, attemptId: number, audioBlob: Blob, recordingTime: number): Promise<void>

// Lấy audio draft
getAudioDraft(questionId: number): Promise<{audioBlob: Blob, recordingTime: number} | null>

// Xóa audio draft
deleteAudioDraft(questionId: number): Promise<void>

// Lấy tất cả drafts cho một attempt
getAllAudioDrafts(attemptId: number): Promise<Array<{questionId, audioBlob, recordingTime}>>

// Clear tất cả data của một attempt
clearAttemptData(attemptId: number): Promise<void>
```

**Database Schema**:
- `pending_submissions` store: Lưu bài chưa submit được do offline
- `audio_drafts` store: Lưu audio recordings để restore sau reload

### 2. OfflineSyncService (`offline-sync.service.ts`)

**Chức năng**: Tự động sync pending submissions khi có mạng

**Features**:
- Auto-detect online/offline events
- Auto-sync khi online
- Manual sync trigger
- Sync status observable
- Smart retry (skip permanent errors)

**API chính**:
```typescript
// Observable để track sync status
syncStatus$: Observable<SyncStatus>

// Manual trigger sync
manualSync(): Promise<void>

// Get pending count
getPendingCount(): Promise<number>

// Check if has pending
hasPendingSubmissions(): Promise<boolean>
```

**Sử dụng**:
```typescript
constructor(private offlineSyncService: OfflineSyncService) {
  // Subscribe to sync status
  this.offlineSyncService.syncStatus$.subscribe(status => {
    console.log('Sync status:', status);
    // Update UI
  });
}
```

### 3. ExamCoordinationService (`exam-coordination.service.ts`)

**Chức năng**: Coordinate exam sessions giữa các tabs/windows

**Features**:
- BroadcastChannel API để giao tiếp giữa tabs
- Detect conflicts (cùng attempt ở 2 tabs)
- Heartbeat mechanism
- Conflict resolution

**API chính**:
```typescript
// Start tracking exam session
startExamSession(examId: number, attemptId: number, partId?: number): Promise<boolean>

// End exam session
endExamSession(): void

// Observable để detect conflicts
conflictDetected$: Observable<boolean>
conflictingSession$: Observable<ExamSession | null>

// Check if has conflict
hasConflict(): boolean

// Force takeover (use with caution)
forceTakeOver(): void
```

**Sử dụng**:
```typescript
// Trong speaking.component.ts ngOnInit
async ngOnInit() {
  // Start coordinating
  const canProceed = await this.examCoordination.startExamSession(
    this.examId,
    this.attemptId,
    this.partId
  );

  if (!canProceed) {
    // Show conflict warning
    const conflicting = this.examCoordination.getConflictingSession();
    const confirmTakeover = confirm(
      `Bài thi này đang được mở ở tab khác (started: ${new Date(conflicting.startTime).toLocaleString()}).\n\n` +
      `Tiếp tục sẽ có thể gây xung đột dữ liệu. Bạn có chắc chắn?`
    );

    if (confirmTakeover) {
      this.examCoordination.forceTakeOver();
    } else {
      // Navigate away
      this.router.navigate(['/exams']);
      return;
    }
  }

  // Subscribe to conflict detection
  this.examCoordination.conflictDetected$.subscribe(hasConflict => {
    if (hasConflict) {
      this.showConflictWarning();
    }
  });
}

ngOnDestroy() {
  // End coordination
  this.examCoordination.endExamSession();
}
```

## II. Tích Hợp vào Speaking Component

### 1. Update speaking-answer-box.component.ts

**Thêm imports**:
```typescript
import { OfflineStorageService } from '../../../Services/offline-storage.service';
import { OfflineSyncService } from '../../../Services/offline-sync.service';
```

**Inject services**:
```typescript
constructor(
  private speakingService: SpeakingService,
  private toastService: ToastService,
  private speakingStateService: SpeakingQuestionStateService,
  private cdr: ChangeDetectorRef,
  private offlineStorage: OfflineStorageService,  // NEW
  private offlineSync: OfflineSyncService          // NEW
) { }
```

**Update submitRecording() để support offline**:
```typescript
async submitRecording(): Promise<void> {
  if (this.state === 'processing' || this.state === 'submitted') {
    console.warn('[SpeakingAnswerBox] Already processing/submitted');
    return;
  }

  if (!this.audioBlob || this.disabled) {
    this.toastService.error('Không có bản ghi âm để nộp');
    return;
  }

  const submittedQuestionId = this.questionId;

  if (!this.attemptId || this.attemptId <= 0) {
    console.error('[SpeakingAnswerBox] Invalid attemptId:', this.attemptId);
    this.toastService.error('Lỗi: Không tìm thấy ID bài thi.');
    this.state = 'error';
    return;
  }

  // ✅ FIX: Check if offline
  if (!navigator.onLine) {
    console.log('[SpeakingAnswerBox] Offline detected - saving to IndexedDB');

    try {
      // Save to offline storage
      await this.offlineStorage.savePendingSubmission({
        questionId: submittedQuestionId,
        attemptId: this.attemptId,
        audioBlob: this.audioBlob,
        recordingTime: this.recordingTime,
        timestamp: Date.now(),
        mimeType: this.audioBlob.type
      });

      this.toastService.info('Đã lưu bài làm offline. Sẽ tự động đồng bộ khi có mạng.');

      // Mark as pending in state service
      this.speakingStateService.updateQuestionState(submittedQuestionId, {
        state: 'has_recording',
        audioBlob: this.audioBlob,
        recordingTime: this.recordingTime
      });

      this.state = 'idle';
      return;
    } catch (error) {
      console.error('[SpeakingAnswerBox] Failed to save offline:', error);
      this.toastService.error('Lỗi lưu bài làm offline. Vui lòng thử lại.');
      this.state = 'error';
      return;
    }
  }

  // ✅ FIX: Check SessionStorage để tránh duplicate submission từ multiple tabs
  const submissionKey = `speaking_submitting_${submittedQuestionId}_${this.attemptId}`;
  const isSubmitting = sessionStorage.getItem(submissionKey);

  if (isSubmitting) {
    console.warn('[SpeakingAnswerBox] Already submitting in another tab/process');
    this.toastService.warning('Bài này đang được nộp. Vui lòng đợi...');
    return;
  }

  // Mark as submitting
  sessionStorage.setItem(submissionKey, 'true');

  this.state = 'processing';
  this.isActivelyProcessing = true;
  this.errorMessage = '';
  this.submitting.emit(true);
  this.speakingStateService.markAsScoring(submittedQuestionId);

  try {
    console.log(`[SpeakingAnswerBox] Submitting answer for question ${submittedQuestionId}`);

    const result = await this.speakingStateService.submitAnswerAndStore(
      submittedQuestionId,
      this.audioBlob,
      this.attemptId
    );

    if (result) {
      this.result = result;
      this.state = 'submitted';
      this.isActivelyProcessing = false;

      // Delete offline draft if exists
      await this.offlineStorage.deleteAudioDraft(submittedQuestionId);

      console.log('[SpeakingAnswerBox] Emitting result for:', submittedQuestionId);
      this.scoringResult.emit({ questionId: submittedQuestionId, result });
      this.answered.emit(true);

      this.cdr.markForCheck();
    }
  } catch (error: any) {
    this.isActivelyProcessing = false;

    // ✅ FIX: Better error handling
    if (error.status === 0 || error.message?.includes('NetworkError')) {
      // Network error - save to offline storage
      console.log('[SpeakingAnswerBox] Network error during submit - saving offline');

      try {
        await this.offlineStorage.savePendingSubmission({
          questionId: submittedQuestionId,
          attemptId: this.attemptId,
          audioBlob: this.audioBlob,
          recordingTime: this.recordingTime,
          timestamp: Date.now(),
          mimeType: this.audioBlob.type
        });

        this.errorMessage = 'Mất kết nối mạng. Bài làm đã được lưu và sẽ tự động đồng bộ khi có mạng.';
        this.toastService.warning(this.errorMessage);
        this.state = 'idle'; // Back to idle so user can try again if needed
      } catch (offlineError) {
        console.error('[SpeakingAnswerBox] Failed to save offline after network error:', offlineError);
        this.errorMessage = 'Lỗi kết nối mạng và không thể lưu offline.';
        this.state = 'error';
        this.toastService.error(this.errorMessage);
      }
    } else {
      // Other errors
      this.errorMessage = error?.error?.message || 'Đã xảy ra lỗi khi chấm điểm. Vui lòng thử lại.';
      this.state = 'error';
      this.toastService.error(this.errorMessage);
    }

    this.cdr.markForCheck();
  } finally {
    // Clear submission lock
    sessionStorage.removeItem(submissionKey);
    this.submitting.emit(false);
  }
}
```

**Update ngOnInit để restore audio drafts**:
```typescript
async ngOnInit() {
  console.log('[SpeakingAnswerBox] ngOnInit called:', {
    questionId: this.questionId,
    initialState: this.state,
  });

  this.currentDisplayedQuestionId = this.questionId;

  if (this.questionId) {
    this.speakingStateService.initializeQuestion(this.questionId);

    // ✅ FIX: Try to restore from IndexedDB first
    const draft = await this.offlineStorage.getAudioDraft(this.questionId);
    if (draft && !this.audioBlob) {
      console.log('[SpeakingAnswerBox] Restored audio draft from IndexedDB');
      this.audioBlob = draft.audioBlob;
      this.recordingTime = draft.recordingTime;
      this.state = 'idle';

      // Save to state service as well
      this.speakingStateService.saveRecording(
        this.questionId,
        draft.audioBlob,
        draft.recordingTime
      );
    }

    this.restoreStateFromService();
    this.cdr.markForCheck();
  }
}
```

**Update stopRecording để save draft to IndexedDB**:
```typescript
stopRecording(): void {
  console.log('[SpeakingAnswerBox] STOP RECORDING called:', {
    questionId: this.questionId,
    currentState: this.state,
    mediaRecorderState: this.mediaRecorder?.state,
  });

  if (this.mediaRecorder && this.state === 'recording') {
    this.mediaRecorder.stop();
    this.clearTimer();
    this.state = 'idle';
    this.toastService.success('Đã dừng ghi âm - Bản ghi đã được lưu như bản nháp');

    this.recordingStatusChange.emit(false);

    // ✅ Note: audioBlob will be available in mediaRecorder.onstop callback
    // We'll save to IndexedDB there
  }
}
```

**Update mediaRecorder.onstop callback để save to IndexedDB**:
```typescript
this.mediaRecorder.onstop = async () => {
  console.log('[SpeakingAnswerBox] mediaRecorder.onstop fired');

  this.audioBlob = new Blob(this.audioChunks, { type: mimeType });
  stream.getTracks().forEach((track) => track.stop());

  // Clear previous audio URL cache
  if (this.audioUrl) {
    URL.revokeObjectURL(this.audioUrl);
    this.audioUrl = null;
  }

  this.recordingStatusChange.emit(false);

  // Save recording to state service as draft
  if (this.audioBlob) {
    console.log(`[SpeakingAnswerBox] Saving recording, size:`, this.audioBlob.size);

    this.speakingStateService.saveRecording(
      this.questionId,
      this.audioBlob,
      this.recordingTime
    );

    // ✅ FIX: Also save to IndexedDB for persistence across page refresh
    try {
      await this.offlineStorage.saveAudioDraft(
        this.questionId,
        this.attemptId,
        this.audioBlob,
        this.recordingTime
      );
      console.log('[SpeakingAnswerBox] Saved draft to IndexedDB');
    } catch (error) {
      console.error('[SpeakingAnswerBox] Failed to save draft to IndexedDB:', error);
    }

    this.cdr.markForCheck();
  }
};
```

**Improve track.onended handler**:
```typescript
// In startRecording(), after getting stream:

// ✅ FIX: Enhanced track.onended handler
stream.getTracks().forEach((track) => {
  track.onended = () => {
    console.error('[SpeakingAnswerBox] TRACK ENDED unexpectedly:', {
      questionId: this.questionId,
      trackKind: track.kind,
      trackState: track.readyState,
      streamActive: stream.active,
      mediaRecorderState: this.mediaRecorder?.state
    });

    // Auto-stop recording
    if (this.state === 'recording') {
      this.stopRecording();

      this.state = 'error';
      this.errorMessage = 'Microphone bị ngắt kết nối. Bản ghi âm đã được lưu. Vui lòng ghi lại nếu cần.';
      this.toastService.error('Microphone bị ngắt kết nối!');

      this.cdr.markForCheck();
    }
  };
});
```

**Update cancelRecording để clear IndexedDB**:
```typescript
async cancelRecording() {
  this.stopRecording();
  this.audioBlob = null;
  this.audioChunks = [];

  if (this.audioUrl) {
    URL.revokeObjectURL(this.audioUrl);
    this.audioUrl = null;
  }

  this.resetComponent();

  // Clear from state service
  this.speakingStateService.clearRecording(this.questionId);

  // ✅ FIX: Clear from IndexedDB
  await this.offlineStorage.deleteAudioDraft(this.questionId);
}
```

**Improve setupVisibilityHandler với long inactive warning**:
```typescript
private setupVisibilityHandler(): void {
  let hiddenStartTime = 0;

  this.visibilityChangeHandler = () => {
    if (document.hidden && this.state === 'recording') {
      // User chuyển tab/minimize → track pause start
      hiddenStartTime = Date.now();
      console.log('[SpeakingAnswerBox] Page hidden, tracking pause time');

      const currentElapsed = Date.now() - this.recordingStartTime - this.pausedTime;
      this.pausedTime += currentElapsed;

    } else if (!document.hidden && this.state === 'recording') {
      // User quay lại tab → check how long was hidden
      const hiddenDuration = Date.now() - hiddenStartTime;
      console.log('[SpeakingAnswerBox] Page visible, was hidden for:', hiddenDuration, 'ms');

      // ✅ FIX: Warning nếu hidden > 2 phút
      if (hiddenDuration > 120000) {
        this.toastService.warning(
          'Tab đã bị ẩn quá lâu (> 2 phút). Bản ghi có thể không chính xác. Khuyến nghị dừng và ghi lại.'
        );
      }

      // ✅ FIX: Check if MediaRecorder still active
      if (this.mediaRecorder?.state !== 'recording') {
        console.error('[SpeakingAnswerBox] MediaRecorder suspended by browser!');

        this.stopRecording();
        this.state = 'error';
        this.errorMessage = 'Ghi âm bị gián đoạn do tab bị ẩn quá lâu. Vui lòng ghi lại.';
        this.toastService.error(this.errorMessage);

        this.cdr.markForCheck();
        return;
      }

      // Resume timer
      this.recordingStartTime = Date.now();
    }
  };

  document.addEventListener('visibilitychange', this.visibilityChangeHandler);
}
```

### 2. Update speaking.component.ts

**Thêm imports**:
```typescript
import { ExamCoordinationService } from '../../../Services/exam-coordination.service';
import { OfflineSyncService } from '../../../Services/offline-sync.service';
import { OfflineStorageService } from '../../../Services/offline-storage.service';
```

**Inject services**:
```typescript
constructor(
  // ... existing services
  private examCoordination: ExamCoordinationService,
  private offlineSync: OfflineSyncService,
  private offlineStorage: OfflineStorageService
) { }
```

**Update ngOnInit**:
```typescript
async ngOnInit() {
  // ... existing code

  // ✅ FIX: Start exam coordination
  if (this.attemptId) {
    const canProceed = await this.examCoordination.startExamSession(
      this.partInfo?.examId || 0,
      this.attemptId,
      this.partInfo?.partId
    );

    if (!canProceed) {
      const conflicting = this.examCoordination.getConflictingSession();
      const confirmTakeover = confirm(
        `Bài thi này đang được mở ở tab khác (bắt đầu lúc ${new Date(conflicting!.startTime).toLocaleString()}).\n\n` +
        `Tiếp tục có thể gây xung đột dữ liệu. Bạn có chắc chắn muốn tiếp tục?`
      );

      if (confirmTakeover) {
        this.examCoordination.forceTakeOver();
      } else {
        this.router.navigate(['/exams']);
        return;
      }
    }

    // Subscribe to conflict detection during exam
    this.examCoordination.conflictDetected$.subscribe(hasConflict => {
      if (hasConflict) {
        const conflicting = this.examCoordination.getConflictingSession();
        this.toastService.warning(
          `Cảnh báo: Bài thi này đang được mở ở tab khác. Có thể xảy ra xung đột dữ liệu!`
        );
      }
    });
  }

  // ✅ FIX: Restore audio drafts from IndexedDB
  if (this.attemptId) {
    const drafts = await this.offlineStorage.getAllAudioDrafts(this.attemptId);
    console.log('[Speaking] Restored', drafts.length, 'audio drafts from IndexedDB');

    drafts.forEach(draft => {
      this.speakingStateService.saveRecording(
        draft.questionId,
        draft.audioBlob,
        draft.recordingTime
      );
    });
  }

  // ✅ FIX: Show pending sync status
  const pendingCount = await this.offlineSync.getPendingCount();
  if (pendingCount > 0) {
    this.toastService.info(`Có ${pendingCount} bài chưa đồng bộ. Đang xử lý...`);
  }
}
```

**Update ngOnDestroy**:
```typescript
ngOnDestroy() {
  this.saveProgressOnExit();

  // ✅ FIX: End exam coordination
  this.examCoordination.endExamSession();
}
```

**Update finishSpeakingExam**:
```typescript
async finishSpeakingExam() {
  // ... existing validation code

  // ✅ FIX: Check for pending offline submissions
  const hasPending = await this.offlineSync.hasPendingSubmissions();
  if (hasPending) {
    const confirmFinish = confirm(
      'Bạn còn bài làm chưa được đồng bộ lên server (có thể do mất mạng trước đó).\n\n' +
      'Nếu kết thúc bài thi ngay, những bài này sẽ không được chấm điểm.\n\n' +
      'Bạn có muốn đợi đồng bộ trước khi kết thúc?'
    );

    if (confirmFinish) {
      this.toastService.info('Đang đồng bộ dữ liệu...');
      await this.offlineSync.manualSync();

      // Check again
      const stillPending = await this.offlineSync.hasPendingSubmissions();
      if (stillPending) {
        this.toastService.error('Vẫn còn bài chưa đồng bộ được. Vui lòng kiểm tra kết nối mạng.');
        return;
      }
    } else {
      return; // User canceled
    }
  }

  // ... existing code to finalize exam

  // ✅ FIX: Clear offline data
  if (this.attemptId) {
    await this.offlineStorage.clearAttemptData(this.attemptId);
  }

  // End coordination
  this.examCoordination.endExamSession();
}
```

## III. Backend Fixes

### 1. Fix Duplicate Submission Idempotency

**Update SpeakingController.cs**:

```csharp
[HttpPost("submit-answer")]
public async Task<IActionResult> SubmitAnswer([FromForm] SubmitSpeakingAnswerRequest request)
{
    try
    {
        // 1. Validate audio file
        if (request.Audio == null || request.Audio.Length == 0)
            return BadRequest(new { message = "Audio file is required." });

        // 2. Get userId from JWT token
        var userIdClaim = User.FindFirstValue(ClaimTypes.NameIdentifier);
        if (string.IsNullOrEmpty(userIdClaim))
            return Unauthorized(new { message = "User not authenticated." });

        var userId = int.Parse(userIdClaim);

        // 3. Validate attemptId
        if (request.AttemptId <= 0)
            return BadRequest(new { message = "Invalid attempt ID." });

        var attempt = await _unitOfWork.ExamAttemptsGeneric.GetAsync(
            a => a.AttemptID == request.AttemptId,
            includeProperties: null
        );

        if (attempt == null)
            return NotFound(new { message = $"Exam attempt {request.AttemptId} not found." });

        if (attempt.UserID != userId)
            return Forbid();

        // ✅ FIX: Check if already submitted (idempotency)
        var existing = await _unitOfWork.UserAnswersSpeaking.GetAsync(
            a => a.AttemptID == request.AttemptId && a.QuestionId == request.QuestionId,
            includeProperties: null
        );

        if (existing != null)
        {
            _logger.LogWarning(
                "[Speaking] Duplicate submission detected - returning existing result: QuestionId={QuestionId}, AttemptId={AttemptId}",
                request.QuestionId,
                request.AttemptId
            );

            // Return existing result instead of error (idempotent)
            return Ok(new SpeakingScoringResultDTO
            {
                QuestionId = existing.QuestionId,
                Transcript = existing.Transcript ?? "",
                AudioUrl = existing.AudioUrl ?? "",
                PronunciationScore = (double)(existing.PronunciationScore ?? 0),
                AccuracyScore = (double)(existing.AccuracyScore ?? 0),
                FluencyScore = (double)(existing.FluencyScore ?? 0),
                CompletenessScore = (double)(existing.CompletenessScore ?? 0),
                GrammarScore = (double)(existing.GrammarScore ?? 0),
                VocabularyScore = (double)(existing.VocabularyScore ?? 0),
                ContentScore = (double)(existing.ContentScore ?? 0),
                OverallScore = (double)(existing.OverallScore ?? 0),
                SubmittedAt = existing.CreatedAt ?? DateTime.UtcNow
            });
        }

        // 4. Process and score (new submission)
        var result = await _speakingScoringService.ProcessAndScoreAnswerAsync(
            request.Audio,
            request.QuestionId,
            request.AttemptId
        );

        return Ok(result);
    }
    catch (Exception ex)
    {
        _logger.LogError(ex, "[Speaking] Error submitting answer: QuestionId={QuestionId}, AttemptId={AttemptId}",
            request.QuestionId, request.AttemptId);
        return StatusCode(500, new { message = "Internal server error", details = ex.Message });
    }
}
```

### 2. Fix NULL Reference - SampleAnswer

**Update SpeakingScoringService.cs**:

```csharp
public async Task<SpeakingScoringResultDTO> ProcessAndScoreAnswerAsync(
    IFormFile audioFile,
    int questionId,
    int attemptId,
    CancellationToken cancellationToken = default)
{
    var sw = Stopwatch.StartNew();

    try
    {
        // ... existing upload code

        // STEP 2: Get question and sample answer
        var question = await _unitOfWork.Questions.GetAsync(
            q => q.QuestionId == questionId,
            includeProperties: "Part"
        );

        if (question == null)
        {
            throw new NotFoundException($"Question with ID {questionId} not found.");
        }

        // ✅ FIX: Better SampleAnswer handling
        string sampleAnswer = question.SampleAnswer ?? "";

        if (string.IsNullOrWhiteSpace(sampleAnswer))
        {
            _logger.LogWarning(
                "[Speaking] Question {QuestionId} has no sample answer, using empty reference text",
                questionId
            );
            sampleAnswer = ""; // Azure will still analyze pronunciation, just without reference alignment
        }

        // ... rest of the code, use sampleAnswer variable

        sw.Stop();
        _logger.LogInformation(
            "[Speaking] Submission successful: QuestionId={QuestionId}, AttemptId={AttemptId}, Duration={Duration}ms, OverallScore={Score}",
            questionId,
            attemptId,
            sw.ElapsedMilliseconds,
            overallScore
        );

        return new SpeakingScoringResultDTO { ... };
    }
    catch (Exception ex)
    {
        sw.Stop();
        _logger.LogError(
            ex,
            "[Speaking] Submission failed: QuestionId={QuestionId}, AttemptId={AttemptId}, Duration={Duration}ms",
            questionId,
            attemptId,
            sw.ElapsedMilliseconds
        );
        throw;
    }
}
```

### 3. Fix Scoring Timeout - Add Cancellation Token

**Update SpeakingController.cs**:

```csharp
[HttpPost("submit-answer")]
public async Task<IActionResult> SubmitAnswer([FromForm] SubmitSpeakingAnswerRequest request)
{
    // ✅ FIX: Add timeout với CancellationToken
    using var cts = new CancellationTokenSource(TimeSpan.FromSeconds(90));

    try
    {
        // ... validation code

        // Process with timeout
        var result = await _speakingScoringService.ProcessAndScoreAnswerAsync(
            request.Audio,
            request.QuestionId,
            request.AttemptId,
            cts.Token // Pass cancellation token
        );

        return Ok(result);
    }
    catch (OperationCanceledException)
    {
        _logger.LogWarning(
            "[Speaking] Scoring timeout: QuestionId={QuestionId}, AttemptId={AttemptId}",
            request.QuestionId,
            request.AttemptId
        );
        return StatusCode(504, new { message = "Scoring timeout. Please try again." });
    }
    catch (Exception ex)
    {
        _logger.LogError(ex, "[Speaking] Error submitting answer");
        return StatusCode(500, new { message = "Internal server error" });
    }
}
```

**Update ProcessAndScoreAnswerAsync signature**:

```csharp
public async Task<SpeakingScoringResultDTO> ProcessAndScoreAnswerAsync(
    IFormFile audioFile,
    int questionId,
    int attemptId,
    CancellationToken cancellationToken = default) // ✅ Add parameter
{
    // Pass cancellationToken to all async operations

    // Upload
    var uploadResult = await _uploadService.UploadFileAsync(audioFile, cancellationToken);

    // Wait for asset
    await EnsureCloudinaryAssetReady(mp3Url, maxRetries: 10, cancellationToken);

    // Azure Speech
    var azureResult = await RetryAzureRecognitionAsync(mp3Url, sampleAnswer, maxRetries: 3, cancellationToken);

    // NLP
    var nlpResult = await GetNlpScoresAsync(azureResult.Transcript, sampleAnswer, cancellationToken);

    // Save to DB
    await _unitOfWork.UserAnswersSpeaking.AddAsync(userAnswerSpeaking, cancellationToken);
    await _unitOfWork.CompleteAsync(cancellationToken);

    return result;
}
```

### 4. Fix Cloudinary Retry - Exponential Backoff

**Update EnsureCloudinaryAssetReady**:

```csharp
private async Task EnsureCloudinaryAssetReady(
    string url,
    int maxRetries = 10,
    CancellationToken cancellationToken = default)
{
    int delayMs = 200;

    for (int i = 0; i < maxRetries; i++)
    {
        cancellationToken.ThrowIfCancellationRequested();

        try
        {
            var response = await _httpClient.GetAsync(
                url,
                HttpCompletionOption.ResponseHeadersRead,
                cancellationToken
            );

            if (response.StatusCode == HttpStatusCode.OK)
            {
                var contentLength = response.Content.Headers.ContentLength;
                var contentType = response.Content.Headers.ContentType?.MediaType;

                // ✅ FIX: More robust check
                if (contentLength.HasValue &&
                    contentLength.Value > 1024 &&
                    contentType?.Contains("audio") == true)
                {
                    _logger.LogInformation(
                        "[Cloudinary] Asset ready: Size={Size}, ContentType={ContentType}, Retries={Retries}",
                        contentLength.Value,
                        contentType,
                        i
                    );
                    return; // Asset ready
                }
            }

            _logger.LogDebug(
                "[Cloudinary] Asset not ready yet (attempt {Attempt}/{MaxRetries}): Status={Status}, Length={Length}",
                i + 1,
                maxRetries,
                response.StatusCode,
                response.Content.Headers.ContentLength
            );

            // ✅ FIX: Exponential backoff with cap
            await Task.Delay(delayMs, cancellationToken);
            delayMs = Math.Min(delayMs * 2, 5000); // Cap at 5 seconds
        }
        catch (HttpRequestException ex)
        {
            _logger.LogWarning(
                "[Cloudinary] HTTP error on attempt {Attempt}/{MaxRetries}: {Error}",
                i + 1,
                maxRetries,
                ex.Message
            );

            if (i == maxRetries - 1)
                throw;

            await Task.Delay(delayMs, cancellationToken);
            delayMs = Math.Min(delayMs * 2, 5000);
        }
    }

    throw new Exception($"Cloudinary asset not ready after {maxRetries} retries. URL: {url}");
}
```

## IV. Testing Checklist

### Manual Testing

- [ ] **Offline Mode**
  - [ ] Disconnect network while recording
  - [ ] Try to submit → Should save to IndexedDB
  - [ ] Reconnect network → Should auto-sync
  - [ ] Check toast notifications

- [ ] **Page Refresh**
  - [ ] Record audio, don't submit
  - [ ] Refresh page
  - [ ] Should restore audio draft

- [ ] **Concurrent Tabs**
  - [ ] Open same exam in 2 tabs
  - [ ] Should show conflict warning
  - [ ] Try to continue in both tabs

- [ ] **Device Change**
  - [ ] Start recording
  - [ ] Disconnect/change microphone
  - [ ] Should show error and save draft

- [ ] **Long Tab Inactive**
  - [ ] Start recording
  - [ ] Switch to another tab for 3+ minutes
  - [ ] Come back → Should show warning

- [ ] **Duplicate Submission**
  - [ ] Submit same question twice (different tabs)
  - [ ] Should return existing result (no error)

- [ ] **Network Error During Submit**
  - [ ] Throttle network to slow 3G
  - [ ] Submit → Might timeout
  - [ ] Should save offline

### Automated Tests

```typescript
describe('OfflineStorageService', () => {
  it('should save and retrieve audio draft', async () => {
    // Test implementation
  });

  it('should save pending submission', async () => {
    // Test implementation
  });
});

describe('OfflineSyncService', () => {
  it('should auto-sync on online event', async () => {
    // Test implementation
  });

  it('should skip permanent errors', async () => {
    // Test implementation
  });
});

describe('ExamCoordinationService', () => {
  it('should detect conflict in multiple tabs', async () => {
    // Test implementation
  });
});
```

## V. Migration Steps

1. **Deploy Services** (Zero downtime):
   - Deploy new services files
   - They won't be used until components are updated

2. **Update Backend** (Deploy first):
   - Deploy backend fixes
   - Idempotent API is backward compatible

3. **Update Frontend** (Deploy after backend):
   - Deploy updated components
   - Test in staging first

4. **Monitor**:
   - Check error logs for issues
   - Monitor IndexedDB usage
   - Check sync success rate

## VI. Rollback Plan

If issues occur:

1. **Frontend Rollback**:
   - Revert to previous component versions
   - Services won't be used if not injected

2. **Backend Rollback**:
   - Revert controller changes
   - Database schema unchanged (no migration needed)

3. **Data Safety**:
   - IndexedDB data is client-side only
   - No server data corruption risk

## VII. Performance Considerations

- IndexedDB operations are async (non-blocking)
- Sync happens in background
- BroadcastChannel is lightweight
- No impact on existing features if not used

## VIII. Browser Compatibility

- **IndexedDB**: Chrome 24+, Firefox 16+, Safari 10+, Edge 12+
- **BroadcastChannel**: Chrome 54+, Firefox 38+, Safari 15.4+, Edge 79+
- **Fallback**: Services gracefully degrade if not supported

## IX. Known Limitations

1. **IndexedDB Size**: Browser-dependent (usually 50MB - 1GB)
2. **BroadcastChannel**: Same-origin only (can't coordinate across domains)
3. **ServiceWorker**: Not implemented yet (future enhancement for true PWA)

## X. Future Enhancements

1. **ServiceWorker** for true offline capability
2. **Background Sync API** for better reliability
3. **Compression** for audio blobs to save space
4. **Analytics** integration to track errors and usage
5. **E2E encryption** for sensitive audio data
