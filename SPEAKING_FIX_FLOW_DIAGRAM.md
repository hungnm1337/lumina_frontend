# 🔄 Speaking Component Flow - Before & After Fix

## ❌ BEFORE FIX - Luồng xử lý SAI

```
┌─────────────────────────────────────────────────────────────────────┐
│ Timeline: User làm câu 1 → Chuyển sang câu 2 → Câu 1 chấm xong    │
└─────────────────────────────────────────────────────────────────────┘

T0: User ở Câu 1
┌──────────────────────┐
│ SpeakingComponent    │ currentIndex = 0
│ currentQuestion: Q1  │
└──────────────────────┘
          │
          ├─► ┌─────────────────────────┐
          │   │ AnswerBox Component Q1  │ state = 'idle'
          │   └─────────────────────────┘
          │
          └─► ┌─────────────────────────┐
              │ AnswerBox Component Q2  │ state = 'idle'
              └─────────────────────────┘

T1: User ghi âm và submit câu 1
┌──────────────────────┐
│ SpeakingComponent    │ currentIndex = 0
└──────────────────────┘
          │
          └─► ┌─────────────────────────┐
              │ AnswerBox Component Q1  │ state = 'processing' ⏳
              │ submitRecording()       │
              │ API.submitAnswer()      │
              └─────────────────────────┘

T2: User chuyển sang câu 2 và BẮT ĐẦU ghi âm
┌──────────────────────┐
│ SpeakingComponent    │ currentIndex = 1 ← ⚠️ ĐÃ THAY ĐỔI!
│ currentQuestion: Q2  │
└──────────────────────┘
          │
          ├─► ┌─────────────────────────┐
          │   │ AnswerBox Component Q1  │ state = 'processing' (hidden)
          │   │ (Đang đợi API response) │
          │   └─────────────────────────┘
          │
          └─► ┌─────────────────────────┐
              │ AnswerBox Component Q2  │ state = 'recording' 🎤
              │ mediaRecorder.start()   │
              │ Timer: 00:05...         │
              └─────────────────────────┘

T3: API câu 1 trả về kết quả (User vẫn đang ghi âm câu 2!)
┌─────────────────────────┐
│ AnswerBox Component Q1  │ state = 'processing'
│ (hidden, đang đợi)      │
└─────────────────────────┘
         │
         │ ✅ API response arrived!
         │
         ├─► this.scoringResult.emit(result) ← ❌ CHỈ EMIT RESULT, KHÔNG CÓ questionId!
         │
         ▼
┌──────────────────────────────────────────────────────────────┐
│ SpeakingComponent.onSpeakingResult(result)                  │
│                                                              │
│ ❌ BUG HERE:                                                 │
│ const q = this.questions[this.currentIndex]; ← currentIndex = 1!│
│ // Lấy nhầm câu 2 thay vì câu 1!                            │
│                                                              │
│ this.speakingResults.set(q.questionId, result); ← Lưu sai! │
│ this.speakingQuestionResults.push({                         │
│   questionNumber: this.currentIndex + 1, ← Sai số thứ tự!  │
│   result: result                                            │
│ });                                                          │
└──────────────────────────────────────────────────────────────┘
         │
         │ Change Detection triggered!
         │
         ▼
┌─────────────────────────┐
│ AnswerBox Component Q2  │ state = 'recording' 🎤
│ (Đang ghi âm!)          │
└─────────────────────────┘
         │
         │ ❌ ngOnChanges() FIRED! (vì parent updated speakingQuestionResults)
         │
         ├─► ❌ restoreStateFromService() được gọi
         │
         ├─► ❌ this.state = 'idle' (RESET STATE!)
         │
         ├─► ❌ mediaRecorder bị STOP
         │
         ├─► ❌ Timer bị CLEAR
         │
         └─► ❌ UI bị RESET → Nút ghi âm biến mất!

💥 KẾT QUẢ: User đang ghi âm câu 2 bị NGẮT, phải reload trang!
```

---

## ✅ AFTER FIX - Luồng xử lý ĐÚNG

```
┌─────────────────────────────────────────────────────────────────────┐
│ Timeline: User làm câu 1 → Chuyển sang câu 2 → Câu 1 chấm xong    │
└─────────────────────────────────────────────────────────────────────┘

T0 → T2: Giống như trước

T3: API câu 1 trả về kết quả (User vẫn đang ghi âm câu 2!)
┌─────────────────────────┐
│ AnswerBox Component Q1  │ state = 'processing'
│ questionId: 101         │
└─────────────────────────┘
         │
         │ ✅ API response arrived!
         │
         ├─► ✅ this.scoringResult.emit({
         │      questionId: 101,  ← ✅ BÂY GIỜ CÓ questionId!
         │      result: result
         │   })
         │
         ▼
┌──────────────────────────────────────────────────────────────┐
│ SpeakingComponent.onSpeakingResult(event)                   │
│                                                              │
│ ✅ FIX:                                                      │
│ const { questionId, result } = event; ← Lấy questionId     │
│                                                              │
│ const q = this.questions.find(                              │
│   q => q.questionId === questionId  ← ✅ TÌM ĐÚNG CÂU!     │
│ );                                                           │
│                                                              │
│ if (!q) {                                                    │
│   console.error('Question not found');                      │
│   return; ← ✅ Early return nếu không tìm thấy            │
│ }                                                            │
│                                                              │
│ console.log('Processing result for correct question:', {    │
│   questionId: 101,                                          │
│   currentIndex: 1,                                          │
│   currentQuestionId: 102,                                   │
│   resultBelongsToCurrentQuestion: false ← ✅ BIẾT LÀ SAI!  │
│ });                                                          │
│                                                              │
│ // ✅ Lưu đúng câu 1:                                       │
│ this.speakingResults.set(101, result);                      │
│                                                              │
│ const questionIndex = this.questions.findIndex(             │
│   q => q.questionId === 101                                 │
│ ); ← ✅ Tìm index đúng                                      │
│                                                              │
│ this.speakingQuestionResults[...] = {                       │
│   questionNumber: questionIndex + 1, ← ✅ Số thứ tự đúng   │
│   result: result                                            │
│ };                                                           │
└──────────────────────────────────────────────────────────────┘
         │
         │ ✅ Smart update - only if hasChanges
         │
         ▼
┌──────────────────────────────────────────────────────────────┐
│ updateSpeakingResults(states)                               │
│                                                              │
│ const hasChanges = newResults !== oldResults;               │
│                                                              │
│ if (hasChanges) {                                            │
│   this.speakingQuestionResults = newResults;                │
│ } else {                                                     │
│   console.log('No changes - skipping update'); ← ✅ SKIP!  │
│ }                                                            │
└──────────────────────────────────────────────────────────────┘
         │
         │ Change Detection (nếu cần)
         │
         ▼
┌─────────────────────────┐
│ AnswerBox Component Q2  │ state = 'recording' 🎤
│ questionId: 102         │
└─────────────────────────┘
         │
         │ ✅ ngOnChanges() FIRED (do parent update)
         │
         ├─► ✅ CHECK GUARDS:
         │   if (this.state === 'recording' || this.state === 'processing') {
         │     console.log('RECORDING IN PROGRESS - Ignoring ALL changes');
         │     return; ← ✅ CHẶN TẠI ĐÂY!
         │   }
         │
         └─► ✅ KHÔNG GỌI restoreStateFromService()
             ✅ KHÔNG RESET state
             ✅ MediaRecorder VẪN CHẠY
             ✅ Timer VẪN CHẠY
             ✅ UI VẪN HIỂN THỊ BÌNH THƯỜNG

✅ KẾT QUẢ: User tiếp tục ghi âm câu 2 KHÔNG BỊ NGẮT!

┌──────────────────────────────────────────────────────────────┐
│ Console Logs (Expected):                                     │
├──────────────────────────────────────────────────────────────┤
│ [SpeakingComponent] 📊 Received scoring result:             │
│   questionId: 101, currentIndex: 1                          │
│ [SpeakingComponent] ✅ Processing result for correct Q      │
│   resultBelongsToCurrentQuestion: false                     │
│ [SpeakingAnswerBox] 🔍 ngOnChanges called: Q102            │
│ [SpeakingAnswerBox] ⚠️ RECORDING IN PROGRESS                │
│ [SpeakingAnswerBox] 🚫 BLOCKED - mediaRecorder: recording   │
└──────────────────────────────────────────────────────────────┘
```

---

## 🛡️ Multiple Layers of Protection

```
┌────────────────────────────────────────────────────────────────┐
│                    Protection Layers                           │
├────────────────────────────────────────────────────────────────┤
│                                                                │
│  Layer 1: Correct Event Data                                  │
│  ├─ Emit questionId with result                               │
│  └─ Parent identifies correct question                        │
│                                                                │
│  Layer 2: Smart Parent Logic                                  │
│  ├─ Use questionId.find() not currentIndex                    │
│  ├─ Validate question exists                                  │
│  └─ Only update if hasChanges                                 │
│                                                                │
│  Layer 3: OnPush Change Detection                             │
│  ├─ Reduce unnecessary CD cycles                              │
│  └─ Only run CD when @Input references change                 │
│                                                                │
│  Layer 4: ngOnChanges Guards                                  │
│  ├─ Block if state === 'recording'                            │
│  ├─ Block if state === 'processing'                           │
│  └─ Only process actual value changes                         │
│                                                                │
│  Layer 5: restoreStateFromService Guards                      │
│  ├─ Check state before restore                                │
│  └─ Skip restore if recording/processing                      │
│                                                                │
│  Layer 6: isRecordingInProgress Flag                          │
│  ├─ Parent tracks recording status                            │
│  └─ Skip UI updates when recording                            │
│                                                                │
└────────────────────────────────────────────────────────────────┘
```

---

## 📊 Comparison Table

| Aspect                      | Before Fix                      | After Fix                         |
| --------------------------- | ------------------------------- | --------------------------------- |
| **Event Data**              | `emit(result)`                  | `emit({ questionId, result })` ✅ |
| **Parent Logic**            | Use `currentIndex` ❌           | Use `questionId` from event ✅    |
| **Question Identification** | Wrong when navigated away ❌    | Always correct ✅                 |
| **Change Detection**        | Default strategy                | OnPush ✅                         |
| **ngOnChanges Protection**  | Only check recording            | Check recording + processing ✅   |
| **State Restoration**       | No protection ❌                | Protected ✅                      |
| **Cross-Component Safety**  | ❌ Components affect each other | ✅ Isolated                       |
| **User Experience**         | 💥 Broken, need reload          | ✅ Smooth, no interruption        |
