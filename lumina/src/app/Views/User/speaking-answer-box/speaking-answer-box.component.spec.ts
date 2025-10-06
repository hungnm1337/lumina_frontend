import { ComponentFixture, TestBed } from '@angular/core/testing';

import { SpeakingAnswerBoxComponent } from './speaking-answer-box.component';

describe('SpeakingAnswerBoxComponent', () => {
  let component: SpeakingAnswerBoxComponent;
  let fixture: ComponentFixture<SpeakingAnswerBoxComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [SpeakingAnswerBoxComponent],
    }).compileComponents();

    fixture = TestBed.createComponent(SpeakingAnswerBoxComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
