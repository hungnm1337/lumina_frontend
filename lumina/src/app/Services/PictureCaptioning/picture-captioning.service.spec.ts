import { TestBed } from '@angular/core/testing';

import { PictureCaptioningService } from './picture-captioning.service';

describe('PictureCaptioningService', () => {
  let service: PictureCaptioningService;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    service = TestBed.inject(PictureCaptioningService);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });
});
