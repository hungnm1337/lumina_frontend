import { Component, Input, Output, EventEmitter } from '@angular/core';
import { CommonModule } from '@angular/common';

export interface SkillItem {
  key: string;
  title: string;
  icon: string;
}

export const DEFAULT_SKILL_ITEMS: SkillItem[] = [
  { key: 'listening', title: 'Listening', icon: 'assets/Icon/Icon_Listening.png' },
  { key: 'reading', title: 'Reading', icon: 'assets/Icon/Icon_Reading.png' },
  { key: 'writing', title: 'Writing', icon: 'assets/Icon/Icon_Writing.png' },
  { key: 'speaking', title: 'Speaking', icon: 'assets/Icon/Icon_Speaking.png' },
];

@Component({
  selector: 'app-skill-list',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './skill-list.component.html',
  styleUrl: './skill-list.component.scss',
})
export class SkillListComponent {
  @Input() skills: SkillItem[] = DEFAULT_SKILL_ITEMS;
  @Output() skillClick = new EventEmitter<SkillItem>();

  onSelectSkill(skill: SkillItem): void {
    this.skillClick.emit(skill);
  }
}
