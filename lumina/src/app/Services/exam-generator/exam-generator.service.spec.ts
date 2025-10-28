import { TestBed } from '@angular/core/testing';

import { ExamGeneratorService } from './exam-generator.service';

describe('ExamGeneratorService', () => {
  let service: ExamGeneratorService;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    service = TestBed.inject(ExamGeneratorService);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });
});
