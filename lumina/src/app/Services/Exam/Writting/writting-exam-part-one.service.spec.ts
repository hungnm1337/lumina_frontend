import { TestBed } from '@angular/core/testing';

import { WrittingExamPartOneService } from './writting-exam-part-one.service';

describe('WrittingExamPartOneService', () => {
  let service: WrittingExamPartOneService;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    service = TestBed.inject(WrittingExamPartOneService);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });
});
