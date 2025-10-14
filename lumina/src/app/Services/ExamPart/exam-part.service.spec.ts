import { TestBed } from '@angular/core/testing';

import { ExamPartService } from './exam-part.service';

describe('ExamPartService', () => {
  let service: ExamPartService;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    service = TestBed.inject(ExamPartService);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });
});
