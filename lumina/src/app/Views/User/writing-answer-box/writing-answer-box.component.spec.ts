import { ComponentFixture, TestBed } from '@angular/core/testing';

import { WritingAnswerBoxComponent } from './writing-answer-box.component';

describe('WritingAnswerBoxComponent', () => {
  let component: WritingAnswerBoxComponent;
  let fixture: ComponentFixture<WritingAnswerBoxComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [WritingAnswerBoxComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(WritingAnswerBoxComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
