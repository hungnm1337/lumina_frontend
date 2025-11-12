import { ComponentFixture, TestBed } from '@angular/core/testing';

import { UserNoteListComponent } from './user-note-list.component';

describe('UserNoteListComponent', () => {
  let component: UserNoteListComponent;
  let fixture: ComponentFixture<UserNoteListComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [UserNoteListComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(UserNoteListComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
