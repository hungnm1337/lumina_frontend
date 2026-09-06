import { OptionDTO, QuestionDTO } from '../../../../Interfaces/exam.interfaces';

export type ReadingView = 'instructions' | 'question';
export type ReadingQuestionKind =
  | 'choice'
  | 'fill-gaps'
  | 'ordering'
  | 'matching'
  | 'unknown';

export interface ReadingGapSegment {
  key: string;
  text: string;
  isGap: boolean;
}

export interface ReadingMatchingPrompt {
  key: string;
  text: string;
}

export interface ReadingQuestionState {
  selectedOptionId: number | null;
  gapSelections: Record<string, string>;
  orderedOptionIds: number[];
  matchingSelections: Record<string, number | null>;
  isComplete: boolean;
}

export interface ReadingQuestionViewModel {
  question: QuestionDTO;
  kind: ReadingQuestionKind;
  promptText: string;
  contentText: string;
  options: OptionDTO[];
  gapSegments: ReadingGapSegment[];
  matchingPrompts: ReadingMatchingPrompt[];
  fixedOption: OptionDTO | null;
}

export type ReadingQuestionChange =
  | {
      type: 'choice';
      selectedOptionId: number;
    }
  | {
      type: 'gaps';
      gapSelections: Record<string, string>;
      isComplete: boolean;
    }
  | {
      type: 'ordering';
      orderedOptionIds: number[];
      isComplete: boolean;
    }
  | {
      type: 'matching';
      matchingSelections: Record<string, number | null>;
      isComplete: boolean;
    };

export function createEmptyReadingQuestionState(): ReadingQuestionState {
  return {
    selectedOptionId: null,
    gapSelections: {},
    orderedOptionIds: [],
    matchingSelections: {},
    isComplete: false,
  };
}
