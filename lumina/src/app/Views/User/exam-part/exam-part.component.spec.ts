import { ComponentFixture, TestBed } from '@angular/core/testing';

import { ExamPartComponent } from './exam-part.component';

describe('ExamPartComponent', () => {
  let component: ExamPartComponent;
  let fixture: ComponentFixture<ExamPartComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [ExamPartComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(ExamPartComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
