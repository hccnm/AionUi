import { describe, expect, it } from 'vitest';
import * as skillParser from './skillSuggestParser';

describe('skill text markers', () => {
  it('extracts inline LOAD_SKILL directives and returns cleaned text', () => {
    expect(typeof skillParser.parseLoadSkills).toBe('function');

    const result = skillParser.parseLoadSkills?.(`
[LOAD_SKILL: opportunity-solution-tree]
[LOAD_SKILL: identify-assumptions-existing]

Recommendation
Keep the remaining answer content.
`);

    expect(result).toEqual({
      skills: ['opportunity-solution-tree', 'identify-assumptions-existing'],
      text: 'Recommendation\nKeep the remaining answer content.',
    });
  });

  it('returns the original text when no LOAD_SKILL directives are present', () => {
    expect(typeof skillParser.parseLoadSkills).toBe('function');

    const text = 'No framework markers here.';
    const result = skillParser.parseLoadSkills?.(text);

    expect(result).toEqual({
      skills: [],
      text,
    });
  });
});
