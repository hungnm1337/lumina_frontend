import { TestBed } from '@angular/core/testing';

import { UserNoteService } from './user-note.service';

describe('UserNoteService', () => {
  let service: UserNoteService;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    service = TestBed.inject(UserNoteService);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });
});
