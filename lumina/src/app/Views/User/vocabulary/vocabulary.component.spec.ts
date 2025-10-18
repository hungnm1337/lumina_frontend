import { ComponentFixture, TestBed } from '@angular/core/testing';

import { UserVocabularyComponent } from './vocabulary.component';

describe('UserVocabularyComponent', () => {
  let component: UserVocabularyComponent;
  let fixture: ComponentFixture<UserVocabularyComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [UserVocabularyComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(UserVocabularyComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
