import { TestBed } from '@angular/core/testing';

import { ExamAttemptService } from './exam-attempt.service';

describe('ExamAttemptService', () => {
  let service: ExamAttemptService;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    service = TestBed.inject(ExamAttemptService);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });
});
