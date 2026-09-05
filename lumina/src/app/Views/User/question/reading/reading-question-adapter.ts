import {
  OptionDTO,
  QuestionDTO,
} from '../../../../Interfaces/exam.interfaces';
import {
  ReadingGapSegment,
  ReadingMatchingPrompt,
  ReadingQuestionKind,
  ReadingQuestionViewModel,
} from './reading-question.models';

export function normalizeQuestionType(value: string | null | undefined): string {
  return (value ?? '')
    .trim()
    .toUpperCase()
    .replace(/[\s-]+/g, '_');
}

export function getReadingQuestionKind(question: QuestionDTO): ReadingQuestionKind {
  const type = normalizeQuestionType(question.questionType);
  const combinedText = [
    question.stemText,
    question.prompt?.title,
    question.prompt?.contentText,
  ]
    .filter(Boolean)
    .join(' ')
    .toUpperCase();

  if (
    /FILL|GAP|CLOZE|PART_1/.test(type) ||
    /EACH GAP|CHOOSE ONE WORD|_{3,}|\[\[.*?\]\]/.test(combinedText)
  ) {
    return 'fill-gaps';
  }

  if (
    /ORDER|SEQUENCE|DRAG|PART_2/.test(type) ||
    /RIGHT ORDER|PUT THE SENTENCES|DRAG/.test(combinedText)
  ) {
    return 'ordering';
  }

  if (
    /MATCH|WHO|PART_4|PART_5/.test(type) ||
    /WHO THINKS|COMMENTS SECTION|READ THE TEXTS/.test(combinedText)
  ) {
    return 'matching';
  }

  if (/CHOICE|SELECT|SINGLE/.test(type) || question.options?.length > 0) {
    return 'choice';
  }

  return 'unknown';
}

function getPromptText(question: QuestionDTO): string {
  return question.stemText?.trim() || question.prompt?.title?.trim() || '';
}

function getContentText(question: QuestionDTO): string {
  return question.prompt?.contentText?.trim() || question.stemText?.trim() || '';
}

function parseGapSegments(text: string): ReadingGapSegment[] {
  const markerPattern = /(\[\[.*?\]\]|\{\{.*?\}\}|_{3,})/g;
  const matches = Array.from(text.matchAll(markerPattern));

  if (matches.length === 0) {
    return [
      { key: 'gap-1-copy', text, isGap: false },
      { key: 'gap-1', text: '', isGap: true },
    ];
  }

  const segments: ReadingGapSegment[] = [];
  let cursor = 0;
  matches.forEach((match, index) => {
    const start = match.index ?? cursor;
    const before = text.slice(cursor, start);
    if (before) {
      segments.push({ key: `copy-${index}`, text: before, isGap: false });
    }
    segments.push({ key: `gap-${index + 1}`, text: '', isGap: true });
    cursor = start + match[0].length;
  });

  const remainder = text.slice(cursor);
  if (remainder) {
    segments.push({ key: 'copy-end', text: remainder, isGap: false });
  }

  return segments;
}

function parseMatchingPrompts(question: QuestionDTO): ReadingMatchingPrompt[] {
  const source = getPromptText(question);
  const numbered = source
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter((line) => /^\d+\.\s+/.test(line));

  if (numbered.length > 0) {
    return numbered.map((line, index) => ({
      key: `match-${index + 1}`,
      text: line.replace(/^\d+\.\s+/, ''),
    }));
  }

  return [{ key: 'match-1', text: source || 'Choose the best answer.' }];
}

export function createReadingQuestionViewModel(
  question: QuestionDTO
): ReadingQuestionViewModel {
  const kind = getReadingQuestionKind(question);
  const promptText = getPromptText(question);
  const contentText = getContentText(question);
  const options: OptionDTO[] = question.options ?? [];

  return {
    question,
    kind,
    promptText,
    contentText,
    options,
    gapSegments: parseGapSegments(contentText),
    matchingPrompts: parseMatchingPrompts(question),
    fixedOption: kind === 'ordering' ? options[0] ?? null : null,
  };
}
