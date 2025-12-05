import { ComponentFixture, TestBed } from '@angular/core/testing';
import { QuestionNavigatorComponent } from './question-navigator.component';

describe('QuestionNavigatorComponent', () => {
  let component: QuestionNavigatorComponent;
  let fixture: ComponentFixture<QuestionNavigatorComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [QuestionNavigatorComponent],
    }).compileComponents();

    fixture = TestBed.createComponent(QuestionNavigatorComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('should emit navigateToQuestion when button is clicked', () => {
    spyOn(component.navigateToQuestion, 'emit');
    const questions = [{ questionId: 1 }, { questionId: 2 }];
    component.questions = questions;
    component.getQuestionStatus = () => 'unanswered';
    fixture.detectChanges();

    component.onNavigateToQuestion(0);
    expect(component.navigateToQuestion.emit).toHaveBeenCalledWith(0);
  });

  it('should emit submitExam when submit button is clicked', () => {
    spyOn(component.submitExam, 'emit');
    component.onSubmitExam();
    expect(component.submitExam.emit).toHaveBeenCalled();
  });

  it('should apply correct button class based on status', () => {
    component.questions = [{ questionId: 1 }];
    component.currentIndex = 0;
    component.getQuestionStatus = () => 'current';

    const buttonClass = component.getButtonClass(0);
    expect(buttonClass).toContain('bg-blue-600');
  });
});
