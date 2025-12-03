import {
  Component,
  Input,
  Output,
  EventEmitter,
  OnChanges,
  SimpleChanges,
  OnDestroy,
  OnInit,
  ChangeDetectionStrategy,
  ChangeDetectorRef,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import {
  SpeakingService,
  SpeakingScoringResult,
} from '../../../Services/Exam/Speaking/speaking.service';
import { ToastService } from '../../../Services/Toast/toast.service';
import { SpeakingQuestionStateService } from '../../../Services/Exam/Speaking/speaking-question-state.service';
import {
  SpeakingTimerService,
  TimerPhase,
} from '../../../Services/Exam/Speaking/speaking-timer.service';
type RecordingState =
  | 'idle'
  | 'recording'
  | 'processing'
  | 'submitted'
  | 'error';

@Component({
  selector: 'app-speaking-answer-box',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './speaking-answer-box.component.html',
  styleUrls: ['./speaking-answer-box.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class SpeakingAnswerBoxComponent
  implements OnInit, OnChanges, OnDestroy
{
  @Input() questionId: number = 0;
  @Input() disabled: boolean = false;
  @Input() resetAt: number = 0;
  @Input() questionTime: number = 0; // DEPRECATED: Use preparationTime & recordingTime instead
  @Input() attemptId: number = 0;

  // NEW: Auto-timer inputs
  @Input() preparationTime: number = 0; // Preparation time in seconds
  @Input() recordingTime: number = 0; // Recording time in seconds
  @Input() showInfoPhase: boolean = false; // Part 4 Q8 only
  @Input() infoReadTime: number = 0; // Part 4 Q8 only (5 seconds)

  @Output() answered = new EventEmitter<boolean>();
  @Output() scoringResult = new EventEmitter<{
    questionId: number;
    result: SpeakingScoringResult;
  }>();
  @Output() submitting = new EventEmitter<boolean>();
  @Output() recordingStatusChange = new EventEmitter<boolean>();
  @Output() autoAdvanceNext = new EventEmitter<void>(); // NEW: Trigger auto-advance to next question

  state: RecordingState = 'idle';
  recordingElapsed: number = 0; // Renamed from recordingTime to avoid conflict with @Input
  private mediaRecorder: MediaRecorder | null = null;
  private audioChunks: Blob[] = [];
  private recordingTimer: any = null;
  private audioBlob: Blob | null = null;

  // ✅ FIX: Track if THIS component is actively processing (not restored state)
  private isActivelyProcessing: boolean = false;

  // ✅ FIX Bug #15: Track which questionId this component is currently displaying
  // This prevents UI from one question bleeding into another when navigating
  private currentDisplayedQuestionId: number = 0;

  // Kết quả chấm điểm
  result: SpeakingScoringResult | null = null;
  errorMessage: string = '';

  // Cache for audio URL to prevent ExpressionChangedAfterItHasBeenCheckedError
  private audioUrl: string | null = null;

  // ✅ FIX: Promise to wait for onstop event completion
  private onStopPromiseResolve: (() => void) | null = null;

  // ✅ FIX Bug #9: Accurate timer với Page Visibility API
  private recordingStartTime: number = 0; // Timestamp khi bắt đầu record
  private pausedTime: number = 0; // Tổng thời gian bị pause (khi user chuyển tab)
  private visibilityChangeHandler: (() => void) | null = null;

  constructor(
    private speakingService: SpeakingService,
    private toastService: ToastService,
    private speakingStateService: SpeakingQuestionStateService,
    private cdr: ChangeDetectorRef,
    public timerService: SpeakingTimerService // NEW: Inject timer service (public for template access)
  ) {
    // Initialize with idle state
    this.state = 'idle';

    // console.log('[SpeakingAnswerBox] 🏗️ Constructor called - Component created');

    // ✅ FIX Bug #9: Setup Page Visibility API
    this.setupVisibilityHandler();
  }

  ngOnInit(): void {
    // console.log('[SpeakingAnswerBox] ngOnInit', this.questionId);

    // ✅ FIX Bug #15: Set current displayed questionId
    this.currentDisplayedQuestionId = this.questionId;

    // ✅ Initialize state service and restore state for this question
    if (this.questionId) {
      this.speakingStateService.initializeQuestion(this.questionId);
      this.restoreStateFromService();

      // ✅ NEW: Auto-start timer flow based on question state
      const state = this.speakingStateService.getQuestionState(this.questionId);
      if (!state || state.state === 'not_started') {
        // Fresh question - start timer flow
        if (this.showInfoPhase && this.infoReadTime > 0) {
          // Part 4 Q8: Start with information phase
          // console.log('[SpeakingAnswerBox] Starting information phase:', this.infoReadTime, 's');
          this.timerService.startInformationReading(this.infoReadTime);
        } else if (this.preparationTime > 0) {
          // Normal flow: Start with preparation
          // console.log('[SpeakingAnswerBox] Starting preparation phase:', this.preparationTime, 's');
          this.timerService.startPreparation(this.preparationTime);
        }
      }

      // ✅ NEW: Subscribe to timer phase transitions
      this.subscribeToTimerEvents();

      // ✅ FIX: Force change detection với OnPush strategy
      this.cdr.markForCheck();
    }
  }

  /**
   * Subscribe to timer service events for phase transitions
   */
  private subscribeToTimerEvents(): void {
    // Information phase ends -> Start preparation
    this.timerService.onInformationEnd$.subscribe(() => {
      // console.log('[SpeakingAnswerBox] Information phase ended, starting preparation');
      if (this.preparationTime > 0) {
        this.timerService.startPreparation(this.preparationTime);
      }
    });

    // Preparation phase ends -> Auto-start recording
    this.timerService.onPreparationEnd$.subscribe(() => {
      // console.log('[SpeakingAnswerBox] Preparation phase ended, auto-starting recording');
      this.startRecordingAutomatic();
    });

    // Recording phase ends -> Auto-stop and auto-submit
    this.timerService.onRecordingEnd$.subscribe(async () => {
      // console.log('[SpeakingAnswerBox] Recording phase ended, auto-submitting');
      await this.handleRecordingEnd();
    });
  }

  /**
   * Auto-start recording (triggered by timer)
   */
  private async startRecordingAutomatic(): Promise<void> {
    try {
      await this.initializeMediaRecorder();

      // Start recording timer
      if (this.recordingTime > 0) {
        this.timerService.startRecording(this.recordingTime); // Fixed typo
      }
    } catch (error) {
      console.error(
        '[SpeakingAnswerBox] Failed to auto-start recording:',
        error
      );
      this.errorMessage = 'Không thể bắt đầu ghi âm. Vui lòng thử lại.';
      this.state = 'error';
      this.toastService.error(this.errorMessage);
    }
  }

  /**
   * Initialize MediaRecorder with microphone stream
   * Extracted from startRecording() for reuse
   */
  private async initializeMediaRecorder(): Promise<void> {
    // Request microphone permission
    const stream = await navigator.mediaDevices.getUserMedia({
      audio: {
        echoCancellation: true,
        noiseSuppression: true,
        sampleRate: 16000,
      },
    });

    // console.log('[SpeakingAnswerBox] MediaStream obtained');

    // Setup track end handler
    stream.getTracks().forEach((track) => {
      track.onended = () => {
        console.error('[SpeakingAnswerBox] 🔴 TRACK ENDED unexpectedly');
        if (this.state === 'recording') {
          this.stopRecording();
          this.state = 'error';
          this.errorMessage = 'Microphone bị ngắt kết nối';
          this.toastService.error('Microphone bị ngắt kết nối!');
          this.cdr.markForCheck();
        }
      };
    });

    // Create MediaRecorder
    const mimeType = this.getSupportedMimeType();
    this.mediaRecorder = new MediaRecorder(stream, { mimeType });
    this.audioChunks = [];

    // Setup event handlers
    this.mediaRecorder.ondataavailable = (event) => {
      if (event.data.size > 0) {
        this.audioChunks.push(event.data);
      }
    };

    this.mediaRecorder.onerror = (event: any) => {
      console.error('[SpeakingAnswerBox] ❌ MediaRecorder ERROR:', event);
      this.state = 'error';
      this.errorMessage = 'Lỗi khi ghi âm';
      this.clearTimer();
      this.recordingStatusChange.emit(false);
    };

    this.mediaRecorder.onstop = async () => {
      console.log(
        '[SpeakingAnswerBox] 📽️ MediaRecorder stopped (initializeMediaRecorder)',
        {
          questionId: this.questionId,
          audioChunksCount: this.audioChunks.length,
          totalSize: this.audioChunks.reduce(
            (acc, chunk) => acc + chunk.size,
            0
          ),
        }
      );

      // ✅ FIX: ALWAYS create audioBlob first, before any state checks
      this.audioBlob = new Blob(this.audioChunks, { type: mimeType });
      console.log(
        '[SpeakingAnswerBox] ✅ audioBlob created:',
        this.audioBlob.size,
        'bytes'
      );

      stream.getTracks().forEach((track) => track.stop());

      // Clear previous audio URL
      if (this.audioUrl) {
        URL.revokeObjectURL(this.audioUrl);
        this.audioUrl = null;
      }

      // ✅ FIX: Save to state service BEFORE checking protected states
      // This ensures audioBlob is persisted even if we skip UI update
      if (this.audioBlob && this.audioBlob.size > 0) {
        const currentState = this.speakingStateService.getQuestionState(
          this.questionId
        );
        const protectedStates: Array<'submitted' | 'scoring' | 'scored'> = [
          'submitted',
          'scoring',
          'scored',
        ];

        if (
          currentState &&
          protectedStates.includes(currentState.state as any)
        ) {
          console.log(
            `[SpeakingAnswerBox] ⚠️ Question in protected state: ${currentState.state} - saving blob but not updating state`
          );
          // ✅ Still save blob to state service for recovery, but don't change state
          // Use internal map update instead of full state update
        } else {
          // Normal flow - save recording with state update
          this.speakingStateService.saveRecording(
            this.questionId,
            this.audioBlob,
            this.recordingElapsed
          );
        }
        this.cdr.markForCheck();
      } else {
        console.error(
          '[SpeakingAnswerBox] ❌ audioBlob is null or empty after onstop!'
        );
      }

      this.recordingStatusChange.emit(false);

      // ✅ FIX: Resolve the Promise if handleRecordingEnd is waiting
      if (this.onStopPromiseResolve) {
        console.log('[SpeakingAnswerBox] 🔓 Resolving onstop Promise');
        this.onStopPromiseResolve();
        this.onStopPromiseResolve = null;
      }
    };

    // Start recording
    this.mediaRecorder.start();
    this.state = 'recording';
    this.recordingElapsed = 0;

    // console.log('[SpeakingAnswerBox] Recording started');
    this.toastService.info('Đang ghi âm...');
    this.recordingStatusChange.emit(true);

    // ✅ FIX: Only update to in_progress if not already in a completed state
    const currentState = this.speakingStateService.getQuestionState(
      this.questionId
    );
    if (
      currentState &&
      !['scored', 'scoring', 'submitted'].includes(currentState.state)
    ) {
      this.speakingStateService.updateQuestionState(this.questionId, {
        state: 'in_progress',
      });
    }
  }

  /**
   * Handle recording end - stop, submit in background, and trigger auto-advance immediately
   */
  private async handleRecordingEnd(): Promise<void> {
    console.log('[SpeakingAnswerBox] 🎬 Handling recording end:', {
      questionId: this.questionId,
      mediaRecorderState: this.mediaRecorder?.state,
      currentState: this.state,
    });

    // Stop MediaRecorder and wait for onstop event
    if (this.mediaRecorder && this.state === 'recording') {
      // ✅ FIX: Create Promise to wait for onstop event properly
      const onStopPromise = new Promise<void>((resolve) => {
        this.onStopPromiseResolve = resolve;

        // ✅ Safety timeout: resolve after 3 seconds max to prevent hanging
        setTimeout(() => {
          if (this.onStopPromiseResolve) {
            console.warn(
              '[SpeakingAnswerBox] ⚠️ onstop event timeout - resolving anyway'
            );
            this.onStopPromiseResolve = null;
            resolve();
          }
        }, 3000);
      });

      this.mediaRecorder.stop();
      this.clearTimer();

      // ✅ FIX: Wait for onstop event to actually fire (not fixed timeout)
      console.log('[SpeakingAnswerBox] ⏳ Waiting for onstop event...');
      await onStopPromise;
      console.log(
        '[SpeakingAnswerBox] ✅ onstop event completed, audioBlob:',
        this.audioBlob ? `${this.audioBlob.size} bytes` : 'NULL'
      );

      // ✅ FIX: Try to recover audioBlob from state service if local is null
      if (!this.audioBlob || this.audioBlob.size === 0) {
        console.warn(
          '[SpeakingAnswerBox] ⚠️ audioBlob null/empty, trying to recover from state service...'
        );
        const savedState = this.speakingStateService.getQuestionState(
          this.questionId
        );
        if (savedState?.audioBlob && savedState.audioBlob.size > 0) {
          this.audioBlob = savedState.audioBlob;
          console.log(
            '[SpeakingAnswerBox] ✅ Recovered audioBlob from state service:',
            this.audioBlob.size,
            'bytes'
          );
        }
      }

      // Auto-submit if we have a recording
      if (this.audioBlob && this.audioBlob.size > 0) {
        console.log(
          '[SpeakingAnswerBox] 📤 Submitting recording in background:',
          this.audioBlob.size,
          'bytes'
        );

        // ✅ Submit in background WITHOUT waiting
        // This allows immediate auto-advance for seamless flow
        this.submitRecording().catch((error) => {
          console.error(
            '[SpeakingAnswerBox] ❌ Background submission failed:',
            error
          );
        });

        // ✅ Trigger auto-advance IMMEDIATELY without waiting for submission
        console.log('[SpeakingAnswerBox] 🚀 Triggering immediate auto-advance');
        this.autoAdvanceNext.emit();
      } else {
        console.error(
          '[SpeakingAnswerBox] ❌ No audioBlob available for submission!',
          {
            audioBlob: this.audioBlob,
            audioChunksCount: this.audioChunks.length,
            questionId: this.questionId,
          }
        );
        this.toastService.error('Không có bản ghi âm. Vui lòng thử lại.');
        this.state = 'error';
        this.errorMessage = 'Không có bản ghi âm để nộp';
        this.cdr.markForCheck();
      }
    }
  }

  ngOnChanges(changes: SimpleChanges): void {
    // console.log('[SpeakingAnswerBox] ngOnChanges:', this.questionId);

    // ✅ CRITICAL FIX: Block ALL changes when recording OR processing
    // This prevents cross-component interference when other questions complete scoring
    if (this.state === 'recording' || this.state === 'processing') {
      console.log(
        `[SpeakingAnswerBox] ⚠️ ${this.state.toUpperCase()} IN PROGRESS - Ignoring ALL changes`
      );
      console.log(
        '[SpeakingAnswerBox] 🚫 BLOCKED - mediaRecorder state:',
        this.mediaRecorder?.state
      );
      return;
    }

    // ✅ ENHANCED: Only process actual value changes for relevant inputs
    const hasQuestionIdChange =
      changes['questionId'] &&
      !changes['questionId'].isFirstChange() &&
      changes['questionId'].currentValue !==
        changes['questionId'].previousValue;

    const hasResetChange =
      changes['resetAt'] &&
      !changes['resetAt'].isFirstChange() &&
      changes['resetAt'].currentValue !== changes['resetAt'].previousValue;

    if (!hasQuestionIdChange && !hasResetChange) {
      // console.log('[SpeakingAnswerBox] No actual value changes - ignoring');
      return;
    }

    // Debug attemptId changes
    if (changes['attemptId']) {
      console.log('[SpeakingAnswerBox] attemptId changed:', {
        current: changes['attemptId'].currentValue,
        previous: changes['attemptId'].previousValue,
        questionId: this.questionId,
      });
    }

    // ✅ FIX Bug #16: ALWAYS update currentDisplayedQuestionId first if questionId changed
    // This ensures currentDisplayedQuestionId is in sync before any restore logic
    if (this.currentDisplayedQuestionId !== this.questionId) {
      console.log(
        '[SpeakingAnswerBox] 🔄 Question ID mismatch detected, updating currentDisplayedQuestionId',
        {
          oldQuestionId: this.currentDisplayedQuestionId,
          newQuestionId: this.questionId,
          triggeredBy: hasQuestionIdChange
            ? 'questionId change'
            : 'resetAt change',
        }
      );
      this.currentDisplayedQuestionId = this.questionId;

      // ✅ FIX Bug #16: FORCE clear audioBlob trước khi reset
      // Đảm bảo không có dấu vết của câu cũ
      if (this.audioBlob) {
        console.log(
          '[SpeakingAnswerBox] 🧹 Force clearing audioBlob from old question'
        );
        this.audioBlob = null;
      }
      if (this.audioUrl) {
        URL.revokeObjectURL(this.audioUrl);
        this.audioUrl = null;
      }

      // ✅ FIX: CLEAR old component state trước khi restore state mới
      this.resetComponent();

      // Initialize and restore state for the new question
      this.speakingStateService.initializeQuestion(this.questionId);
      this.restoreStateFromService();

      console.log('[SpeakingAnswerBox] ✅ Question switch complete:', {
        newQuestionId: this.questionId,
        newState: this.state,
        hasAudioBlob: !!this.audioBlob,
        canStartRecording: this.canStartRecording,
      });

      // ✅ FIX: Force change detection với OnPush strategy
      this.cdr.markForCheck();
    } else if (hasResetChange) {
      // ✅ Only handle resetChange if questionId didn't change
      // This handles navigation within the same question (edge case)
      console.log(
        '[SpeakingAnswerBox] 🔄 resetAt changed without questionId change'
      );

      // If currently recording, stop and save as draft before navigating
      if ((this.state as string) === 'recording') {
        this.stopRecording();
        // Wait a bit for the recording to be saved, then restore state
        setTimeout(() => {
          this.restoreStateFromService();
          this.cdr.markForCheck();
        }, 100);
      } else {
        // For speaking questions: preserve state when navigating
        this.restoreStateFromService();
        this.cdr.markForCheck();
      }
    }
  }

  private restoreStateFromService(): void {
    // ✅ CRITICAL: Don't restore if currently recording or processing
    if (this.state === 'recording' || this.state === 'processing') {
      console.log(
        `[SpeakingAnswerBox] ⚠️ Skipping restore - ${this.state} in progress`
      );
      return;
    }

    const savedState = this.speakingStateService.getQuestionState(
      this.questionId
    );
    console.log(
      `[SpeakingAnswerBox] restoreStateFromService: questionId=${this.questionId}, savedState=`,
      savedState
    );

    if (savedState) {
      // Clear previous audio URL cache
      if (this.audioUrl) {
        URL.revokeObjectURL(this.audioUrl);
        this.audioUrl = null;
      }

      // ✅ FIX: Restore basic data (but NOT audioBlob yet - will set conditionally)
      this.recordingElapsed = savedState.recordingTime;
      this.result = savedState.result;
      this.errorMessage = savedState.errorMessage;

      console.log(`[SpeakingAnswerBox] Saved state data:`, {
        hasAudioBlob: !!savedState.audioBlob,
        recordingTime: savedState.recordingTime,
        hasResult: !!savedState.result,
        savedStateType: savedState.state,
      });

      // Set component state based on saved state
      // PRIORITY: If result exists, always show submitted state regardless of saved state
      if (savedState.result) {
        this.state = 'submitted';
        this.isActivelyProcessing = false; // Not actively processing, already has result
        this.audioBlob = null; // ✅ Don't show draft UI when has result
        console.log(
          `[SpeakingAnswerBox] Result exists, setting state to 'submitted'`
        );
      } else if (
        savedState.state === 'submitted' ||
        savedState.state === 'scored'
      ) {
        this.state = 'submitted';
        this.isActivelyProcessing = false;
        this.audioBlob = null; // ✅ Don't show draft UI when submitted
      } else if (savedState.state === 'has_recording') {
        // ✅ FIX: Validate audioBlob before restoring
        if (savedState.audioBlob && savedState.audioBlob.size > 0) {
          this.state = 'idle'; // Show the recording is ready to submit
          this.isActivelyProcessing = false;
          this.audioBlob = savedState.audioBlob; // ✅ Keep audioBlob - user can submit/re-record
          console.log(
            '[SpeakingAnswerBox] ✅ Restored valid recording from state service:',
            {
              blobSize: savedState.audioBlob.size,
              recordingElapsed: savedState.recordingTime,
            }
          );
        } else {
          // Invalid blob - clear it
          console.warn(
            '[SpeakingAnswerBox] ⚠️ Found invalid blob in state service, clearing...',
            {
              hasBlob: !!savedState.audioBlob,
              blobSize: savedState.audioBlob?.size || 0,
            }
          );
          this.state = 'idle';
          this.isActivelyProcessing = false;
          this.audioBlob = null;
          // Clear from state service too
          this.speakingStateService.clearRecording(this.questionId);
        }
      } else if (savedState.state === 'scoring') {
        // ✅ FIX: CRITICAL - When navigating to a question that's scoring in background,
        // DON'T show processing spinner UI. Show as submitted instead.
        // Processing spinner only shows when user actively submits from THIS component.
        console.log(
          `[SpeakingAnswerBox] ⚠️ Question is scoring in background (not actively), showing as submitted`
        );
        this.state = 'submitted'; // Show submitted state, not processing
        this.isActivelyProcessing = false; // Not actively processing in THIS component
        this.audioBlob = null; // ✅ Don't show draft UI when submitted
      } else if (savedState.state === 'in_progress') {
        // ✅ FIX: Validate audioBlob before restoring
        if (savedState.audioBlob && savedState.audioBlob.size > 0) {
          this.state = 'idle'; // Reset to idle if was in progress
          this.isActivelyProcessing = false;
          this.audioBlob = savedState.audioBlob; // Restore if exists
          console.log(
            '[SpeakingAnswerBox] ✅ Restored in-progress recording:',
            {
              blobSize: savedState.audioBlob.size,
            }
          );
        } else {
          console.warn(
            '[SpeakingAnswerBox] ⚠️ Invalid blob in in_progress state, clearing...'
          );
          this.state = 'idle';
          this.isActivelyProcessing = false;
          this.audioBlob = null;
          this.speakingStateService.clearRecording(this.questionId);
        }
      } else {
        this.state = 'idle';
        this.isActivelyProcessing = false;
        this.audioBlob = null;
      }
      console.log(
        `[SpeakingAnswerBox] Restored state: component.state=${
          this.state
        }, savedState.state=${savedState.state}, isActivelyProcessing=${
          this.isActivelyProcessing
        }, hasAudioBlob=${!!this.audioBlob}`
      );
    } else {
      // No saved state, reset component
      console.log(`[SpeakingAnswerBox] No saved state, resetting component`);
      this.resetComponent();
    }

    // ✅ FIX: Force change detection after restore
    this.cdr.markForCheck();
  }

  ngOnDestroy(): void {
    console.log(
      '[SpeakingAnswerBox] 💥 ngOnDestroy called - Component being destroyed!',
      {
        questionId: this.questionId,
        currentState: this.state,
        isRecording: this.state === 'recording',
      }
    );

    // ✅ FIX: Resolve any pending onstop promise before destroy
    if (this.onStopPromiseResolve) {
      console.log(
        '[SpeakingAnswerBox] 🔓 Resolving pending onstop Promise on destroy'
      );
      this.onStopPromiseResolve();
      this.onStopPromiseResolve = null;
    }

    this.stopRecording();
    this.clearTimer();

    // Clean up audio URL
    if (this.audioUrl) {
      URL.revokeObjectURL(this.audioUrl);
      this.audioUrl = null;
    }

    // ✅ FIX Bug #9: Remove visibility event listener
    if (this.visibilityChangeHandler) {
      document.removeEventListener(
        'visibilitychange',
        this.visibilityChangeHandler
      );
      this.visibilityChangeHandler = null;
    }
  }

  async startRecording(): Promise<void> {
    console.log('[SpeakingAnswerBox] 🎤 START RECORDING called:', {
      questionId: this.questionId,
      currentDisplayedQuestionId: this.currentDisplayedQuestionId,
      currentState: this.state,
      disabled: this.disabled,
      audioBlob: !!this.audioBlob,
      canStartRecording: this.canStartRecording,
    });

    // ✅ FIX Bug #16: FORCE sync currentDisplayedQuestionId if mismatch detected
    // This handles timing issues where user clicks too fast after navigation
    if (this.currentDisplayedQuestionId !== this.questionId) {
      console.warn(
        '[SpeakingAnswerBox] ⚠️ Timing issue detected - questionId mismatch, force syncing!',
        {
          oldDisplayed: this.currentDisplayedQuestionId,
          newQuestionId: this.questionId,
        }
      );

      // Force sync and cleanup
      this.currentDisplayedQuestionId = this.questionId;

      // Force clear old state
      if (this.audioBlob) {
        console.log('[SpeakingAnswerBox] 🧹 Force clearing audioBlob');
        this.audioBlob = null;
      }
      if (this.audioUrl) {
        URL.revokeObjectURL(this.audioUrl);
        this.audioUrl = null;
      }

      // Force reset and restore
      this.resetComponent();
      this.speakingStateService.initializeQuestion(this.questionId);
      this.restoreStateFromService();

      console.log(
        '[SpeakingAnswerBox] ✅ Force sync complete, retrying startRecording'
      );

      // Force change detection
      this.cdr.detectChanges();

      // Verify state is now correct
      if (this.state !== 'idle') {
        console.error(
          '[SpeakingAnswerBox] ❌ State still not idle after sync:',
          this.state
        );
        this.toastService.error(
          'Lỗi: Trạng thái không hợp lệ. Vui lòng thử lại.'
        );
        return;
      }
    }

    if (this.disabled) {
      console.log('[SpeakingAnswerBox] ⚠️ Cannot start - component disabled');
      this.toastService.warning('Không thể ghi âm lúc này');
      return;
    }

    if (this.state !== 'idle') {
      console.log('[SpeakingAnswerBox] ⚠️ Cannot start - state not idle:', {
        currentState: this.state,
      });
      this.toastService.warning(
        `Không thể ghi âm - trạng thái hiện tại: ${this.state}`
      );
      return;
    }

    try {
      // Request microphone permission
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
          sampleRate: 16000,
        },
      });

      console.log('[SpeakingAnswerBox] 🎙️ MediaStream obtained:', {
        questionId: this.questionId,
        streamActive: stream.active,
        tracks: stream.getTracks().map((t) => ({
          kind: t.kind,
          readyState: t.readyState,
          enabled: t.enabled,
        })),
      });

      // ✅ FIX: Enhanced track.onended handler for device disconnection
      stream.getTracks().forEach((track) => {
        track.onended = () => {
          console.error('[SpeakingAnswerBox] 🔴 TRACK ENDED unexpectedly:', {
            questionId: this.questionId,
            trackKind: track.kind,
            trackState: track.readyState,
            streamActive: stream.active,
            mediaRecorderState: this.mediaRecorder?.state,
          });

          // ✅ FIX: Auto-stop recording and show error
          if (this.state === 'recording') {
            this.stopRecording();

            this.state = 'error';
            this.errorMessage =
              'Microphone bị ngắt kết nối. Bản ghi âm đã được lưu. Vui lòng ghi lại nếu cần.';
            this.toastService.error('Microphone bị ngắt kết nối!');

            this.cdr.markForCheck();
          }
        };
      });

      // Sử dụng webm codec vì được hỗ trợ rộng rãi
      const mimeType = this.getSupportedMimeType();
      this.mediaRecorder = new MediaRecorder(stream, { mimeType });
      this.audioChunks = [];

      this.mediaRecorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          this.audioChunks.push(event.data);
        }
      };

      this.mediaRecorder.onerror = (event: any) => {
        console.error('[SpeakingAnswerBox] ❌ MediaRecorder ERROR:', event);
        this.state = 'error';
        this.errorMessage = 'Lỗi khi ghi âm. Vui lòng thử lại.';
        this.clearTimer();
        this.recordingStatusChange.emit(false);
      };

      this.mediaRecorder.onstop = async () => {
        console.log(
          '[SpeakingAnswerBox] 📽️ mediaRecorder.onstop fired (startRecording):',
          {
            questionId: this.questionId,
            currentState: this.state,
            audioChunksCount: this.audioChunks.length,
            totalSize: this.audioChunks.reduce(
              (acc, chunk) => acc + chunk.size,
              0
            ),
            recorderState: this.mediaRecorder?.state,
          }
        );

        // ✅ FIX: ALWAYS create audioBlob first, before any state checks
        this.audioBlob = new Blob(this.audioChunks, { type: mimeType });
        console.log(
          '[SpeakingAnswerBox] ✅ audioBlob created:',
          this.audioBlob.size,
          'bytes'
        );

        stream.getTracks().forEach((track) => track.stop());

        // Clear previous audio URL cache
        if (this.audioUrl) {
          URL.revokeObjectURL(this.audioUrl);
          this.audioUrl = null;
        }

        // ✅ Notify parent: kết thúc recording (kể cả khi tự động stop)
        this.recordingStatusChange.emit(false);
        console.log(
          '[SpeakingAnswerBox] 📡 Emitted recordingStatusChange(false) from onstop'
        );

        // ✅ FIX: Save to state service BEFORE checking protected states
        if (this.audioBlob && this.audioBlob.size > 0) {
          const currentState = this.speakingStateService.getQuestionState(
            this.questionId
          );
          const protectedStates: Array<'submitted' | 'scoring' | 'scored'> = [
            'submitted',
            'scoring',
            'scored',
          ];

          if (
            currentState &&
            protectedStates.includes(currentState.state as any)
          ) {
            console.log(
              `[SpeakingAnswerBox] ⚠️ Question in protected state: ${currentState.state} - blob created but not saving to state`
            );
            // ✅ audioBlob is still available locally for submission
          } else {
            // Normal flow - save recording with state update
            console.log(
              `[SpeakingAnswerBox] 💾 Saving recording to state service, size:`,
              this.audioBlob.size
            );
            this.speakingStateService.saveRecording(
              this.questionId,
              this.audioBlob,
              this.recordingTime
            );
          }
          // ✅ FIX: Trigger change detection after saving
          this.cdr.markForCheck();
        } else {
          console.error(
            '[SpeakingAnswerBox] ❌ audioBlob is null or empty after onstop!'
          );
        }

        // ✅ FIX: Resolve the Promise if handleRecordingEnd is waiting
        if (this.onStopPromiseResolve) {
          console.log('[SpeakingAnswerBox] 🔓 Resolving onstop Promise');
          this.onStopPromiseResolve();
          this.onStopPromiseResolve = null;
        }
      };

      this.mediaRecorder.start();
      this.state = 'recording';
      console.log('[SpeakingAnswerBox] ✅ State changed to RECORDING:', {
        questionId: this.questionId,
        mediaRecorderState: this.mediaRecorder.state,
      });
      this.recordingTime = 0;
      this.startTimer();
      this.toastService.info('Đang ghi âm...');

      // ✅ Notify parent: bắt đầu recording
      this.recordingStatusChange.emit(true);
      console.log('[SpeakingAnswerBox] 📡 Emitted recordingStatusChange(true)');

      // ✅ FIX: Only update to in_progress if not already in a completed state
      const currentState = this.speakingStateService.getQuestionState(
        this.questionId
      );
      if (
        currentState &&
        !['scored', 'scoring', 'submitted'].includes(currentState.state)
      ) {
        this.speakingStateService.updateQuestionState(this.questionId, {
          state: 'in_progress',
        });
      }
    } catch (error) {
      console.error('Error accessing microphone:', error);
      this.errorMessage =
        'Không thể truy cập microphone. Vui lòng cho phép quyền truy cập.';
      this.state = 'error';
      this.toastService.error('Không thể truy cập microphone');
    }
  }

  stopRecording(): void {
    console.log('[SpeakingAnswerBox] 🛑 STOP RECORDING called:', {
      questionId: this.questionId,
      currentState: this.state,
      mediaRecorderState: this.mediaRecorder?.state,
    });

    if (this.mediaRecorder && this.state === 'recording') {
      this.mediaRecorder.stop();
      this.clearTimer();
      this.state = 'idle';
      console.log(
        '[SpeakingAnswerBox] ✅ State changed to IDLE after stopping'
      );
      this.toastService.success(
        'Đã dừng ghi âm - Bản ghi đã được lưu như bản nháp'
      );

      // ✅ Notify parent: kết thúc recording
      this.recordingStatusChange.emit(false);
      console.log(
        '[SpeakingAnswerBox] 📡 Emitted recordingStatusChange(false)'
      );

      // Save recording to state service as draft
      // Note: audioBlob will be available in mediaRecorder.onstop callback
      console.log(
        `[SpeakingAnswerBox] stopRecording called, audioBlob:`,
        this.audioBlob ? 'EXISTS' : 'NULL'
      );
    }
  }

  async submitRecording(): Promise<void> {
    if (this.state === 'processing' || this.state === 'submitted') {
      console.warn('[SpeakingAnswerBox] Already processing/submitted');
      return;
    }

    // ✅ FIX Bug #17: Capture questionId at submission time
    const submittedQuestionId = this.questionId;

    // ✅ FIX: Enhanced audioBlob validation with recovery attempt
    if (!this.audioBlob || this.audioBlob.size === 0) {
      console.warn(
        '[SpeakingAnswerBox] ⚠️ audioBlob null/empty, attempting recovery...'
      );

      // Try to recover from state service
      const savedState =
        this.speakingStateService.getQuestionState(submittedQuestionId);
      if (savedState?.audioBlob && savedState.audioBlob.size > 0) {
        this.audioBlob = savedState.audioBlob;
        console.log(
          '[SpeakingAnswerBox] ✅ Recovered audioBlob from state service:',
          this.audioBlob.size,
          'bytes'
        );
      } else {
        console.error(
          '[SpeakingAnswerBox] ❌ Cannot recover audioBlob - no valid recording found'
        );
        this.toastService.error(
          'Không có bản ghi âm để nộp. Vui lòng ghi âm lại.'
        );
        this.state = 'error';
        this.errorMessage = 'Không có bản ghi âm để nộp';
        this.cdr.markForCheck();
        return;
      }
    }

    if (this.disabled) {
      this.toastService.error('Không thể nộp bài lúc này');
      return;
    }

    console.log('[SpeakingAnswerBox] 📤 submitRecording called:', {
      questionId: submittedQuestionId,
      audioBlobSize: this.audioBlob?.size,
      attemptId: this.attemptId,
    });

    console.log('[SpeakingAnswerBox] 🔍 DEBUG attemptId:', {
      attemptId: this.attemptId,
      type: typeof this.attemptId,
      questionId: submittedQuestionId,
      hasAudioBlob: !!this.audioBlob,
    });

    if (!this.attemptId || this.attemptId <= 0) {
      console.error(
        '[SpeakingAnswerBox] ❌ Invalid attemptId:',
        this.attemptId
      );
      this.toastService.error(
        'Lỗi: Không tìm thấy ID bài thi. Vui lòng refresh trang và thử lại.'
      );
      this.state = 'error';
      return;
    }

    // ✅ Check if online before submitting
    if (!navigator.onLine) {
      this.toastService.error(
        'Không có kết nối mạng. Vui lòng kiểm tra và thử lại.'
      );
      return;
    }

    // ✅ FIX: Check SessionStorage to prevent duplicate submission from multiple tabs
    const submissionKey = `speaking_submitting_${submittedQuestionId}_${this.attemptId}`;
    const isSubmitting = sessionStorage.getItem(submissionKey);

    if (isSubmitting) {
      console.warn(
        '[SpeakingAnswerBox] ⚠️ Already submitting in another tab/process'
      );
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
      console.log(
        `[SpeakingAnswerBox] Submitting answer for question ${submittedQuestionId}`
      );

      const result = await this.speakingStateService.submitAnswerAndStore(
        submittedQuestionId,
        this.audioBlob,
        this.attemptId
      );

      if (result) {
        this.result = result;
        this.state = 'submitted';
        this.isActivelyProcessing = false;

        console.log(
          '[SpeakingAnswerBox] 📤 Emitting result for:',
          submittedQuestionId
        );
        this.scoringResult.emit({ questionId: submittedQuestionId, result });
        this.answered.emit(true);

        this.cdr.markForCheck();
      }
    } catch (error: any) {
      this.isActivelyProcessing = false;

      this.errorMessage =
        error?.error?.message ||
        'Đã xảy ra lỗi khi chấm điểm. Vui lòng thử lại.';
      this.state = 'error';
      this.toastService.error(this.errorMessage);

      this.cdr.markForCheck();
    } finally {
      // Clear submission lock
      sessionStorage.removeItem(submissionKey);
      this.submitting.emit(false);
    }
  }

  cancelRecording(): void {
    this.stopRecording();
    this.audioBlob = null;
    this.audioChunks = [];

    // ✅ FIX: Clear audio URL cache to prevent memory leak
    if (this.audioUrl) {
      URL.revokeObjectURL(this.audioUrl);
      this.audioUrl = null;
    }

    this.resetComponent();

    // Clear from state service
    this.speakingStateService.clearRecording(this.questionId);
  }

  private resetComponent(): void {
    console.log('[SpeakingAnswerBox] 🔄 Resetting component to clean state', {
      currentQuestionId: this.currentDisplayedQuestionId,
      oldState: this.state,
    });
    this.state = 'idle';
    this.recordingElapsed = 0;
    this.audioBlob = null;
    this.audioChunks = [];
    this.result = null;
    this.errorMessage = '';
    this.isActivelyProcessing = false; // ✅ FIX: Clear flag
    this.onStopPromiseResolve = null; // ✅ FIX: Clear pending promise resolver
    this.clearTimer();
    if (this.audioUrl) {
      URL.revokeObjectURL(this.audioUrl);
      this.audioUrl = null;
    }
    // ✅ FIX Bug #15: DO NOT reset currentDisplayedQuestionId here
    // It should only be updated when questionId @Input changes
    console.log('[SpeakingAnswerBox] ✅ Component reset complete');
    // ✅ FIX: Force UI update with OnPush
    this.cdr.markForCheck();
  }

  private startTimer(): void {
    this.clearTimer();

    // ✅ FIX Bug #9: Lưu timestamp khi bắt đầu record
    this.recordingStartTime = Date.now();
    this.pausedTime = 0;

    this.recordingTimer = setInterval(() => {
      // ✅ FIX: Tính thời gian dựa trên timestamp thay vì đếm tăng dần
      const elapsed = Math.floor(
        (Date.now() - this.recordingStartTime - this.pausedTime) / 1000
      );
      this.recordingElapsed = elapsed;

      // ✅ FIX: Trigger change detection để cập nhật UI khi dùng OnPush strategy
      this.cdr.markForCheck();

      // Auto-stop based on question time limit (if set) or default 120 seconds
      const timeLimit = this.questionTime > 0 ? this.questionTime : 120;
      if (this.recordingElapsed >= timeLimit) {
        this.stopRecording();
        this.toastService.warning(
          'Hết thời gian ghi âm! Bản ghi đã được lưu như bản nháp.'
        );
      }
    }, 1000);
  }

  private clearTimer(): void {
    if (this.recordingTimer) {
      clearInterval(this.recordingTimer);
      this.recordingTimer = null;
    }
  }

  // ✅ FIX Bug #9: Setup Page Visibility API để handle khi user chuyển tab
  private setupVisibilityHandler(): void {
    let hiddenStartTime = 0;

    this.visibilityChangeHandler = () => {
      if (document.hidden && this.state === 'recording') {
        // User chuyển tab/minimize → track pause start
        hiddenStartTime = Date.now();
        console.log('[SpeakingAnswerBox] ⚠️ Page hidden, tracking pause time');

        const currentElapsed =
          Date.now() - this.recordingStartTime - this.pausedTime;
        this.pausedTime += currentElapsed;
      } else if (!document.hidden && this.state === 'recording') {
        // User quay lại tab → check how long was hidden
        const hiddenDuration = Date.now() - hiddenStartTime;
        console.log(
          '[SpeakingAnswerBox] ✅ Page visible, was hidden for:',
          hiddenDuration,
          'ms'
        );

        // ✅ FIX: Warning nếu hidden > 2 phút
        if (hiddenDuration > 120000) {
          this.toastService.warning(
            'Tab đã bị ẩn quá lâu (> 2 phút). Bản ghi có thể không chính xác. Khuyến nghị dừng và ghi lại.'
          );
        }

        // ✅ FIX: Check if MediaRecorder still active
        if (this.mediaRecorder?.state !== 'recording') {
          console.error(
            '[SpeakingAnswerBox] ❌ MediaRecorder suspended by browser!'
          );

          this.stopRecording();
          this.state = 'error';
          this.errorMessage =
            'Ghi âm bị gián đoạn do tab bị ẩn quá lâu. Vui lòng ghi lại.';
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

  private getSupportedMimeType(): string {
    const types = [
      'audio/webm;codecs=opus',
      'audio/webm',
      'audio/ogg;codecs=opus',
      'audio/mp4',
    ];

    for (const type of types) {
      if (MediaRecorder.isTypeSupported(type)) {
        return type;
      }
    }

    return 'audio/webm'; // fallback
  }

  get formattedTime(): string {
    const minutes = Math.floor(this.recordingElapsed / 60);
    const seconds = this.recordingElapsed % 60;
    return `${minutes.toString().padStart(2, '0')}:${seconds
      .toString()
      .padStart(2, '0')}`;
  }

  get hasRecording(): boolean {
    // ✅ FIX Bug #15: Only show recording for current question
    return (
      this.audioBlob !== null &&
      this.currentDisplayedQuestionId === this.questionId
    );
  }

  get canStartRecording(): boolean {
    // ✅ FIX Bug #15: Only allow recording for current question
    return (
      !this.disabled &&
      (this.state === 'idle' || this.state === 'error') &&
      this.currentDisplayedQuestionId === this.questionId
    );
  }

  get isRecording(): boolean {
    // ✅ FIX Bug #15: Only show recording UI for current question
    return (
      this.state === 'recording' &&
      this.currentDisplayedQuestionId === this.questionId
    );
  }

  get isProcessing(): boolean {
    // ✅ FIX Bug #15: Only show processing UI if:
    // 1. State is 'processing'
    // 2. Actively processing in THIS component (not restored from service)
    // 3. The processing belongs to the CURRENT displayed question
    const savedState = this.speakingStateService.getQuestionState(
      this.questionId
    );
    const isProcessingCurrentQuestion =
      this.state === 'processing' &&
      this.isActivelyProcessing &&
      this.currentDisplayedQuestionId === this.questionId &&
      savedState?.state === 'scoring'; // Service confirms this question is being scored

    return isProcessingCurrentQuestion;
  }

  get isSubmitted(): boolean {
    // ✅ FIX Bug #15: Only show submitted UI for current question
    return (
      this.state === 'submitted' &&
      this.currentDisplayedQuestionId === this.questionId
    );
  }

  get isError(): boolean {
    // ✅ FIX Bug #15: Only show error UI for current question
    return (
      this.state === 'error' &&
      this.currentDisplayedQuestionId === this.questionId
    );
  }

  getAudioUrl(): string | null {
    if (this.audioBlob && !this.audioUrl) {
      this.audioUrl = URL.createObjectURL(this.audioBlob);
    }
    return this.audioUrl;
  }
}
