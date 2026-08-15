import { describe, it, expect } from 'vitest';
import { cleanAiJson } from '@/lib/ai-generation-utils';

describe('cleanAiJson', () => {
  it('keeps the full object when it contains an array field', () => {
    const raw = `{
  "units": [
    { "title": "A", "topics": [{ "title": "T1" }] },
    { "title": "B", "topics": [{ "title": "T2" }] }
  ]
}`;
    const cleaned = cleanAiJson(raw);
    const parsed = JSON.parse(cleaned);
    expect(Array.isArray(parsed)).toBe(false);
    expect(parsed.units).toHaveLength(2);
    expect(parsed.units[0].title).toBe('A');
  });

  it('extracts a top-level array response', () => {
    const raw = 'Here is the list: [{"id":1},{"id":2}] thanks';
    const cleaned = cleanAiJson(raw);
    const parsed = JSON.parse(cleaned);
    expect(Array.isArray(parsed)).toBe(true);
    expect(parsed).toHaveLength(2);
  });

  it('handles code-fence-wrapped JSON', () => {
    const raw = '```json\n{"units":[{"title":"X"}]}\n```';
    const cleaned = cleanAiJson(raw);
    const parsed = JSON.parse(cleaned);
    expect(parsed.units[0].title).toBe('X');
  });

  it('ignores brackets inside string values', () => {
    const raw = '{ "note": "use [x] and {y}", "list": ["a", "b"] }';
    const cleaned = cleanAiJson(raw);
    const parsed = JSON.parse(cleaned);
    expect(parsed.note).toBe('use [x] and {y}');
    expect(parsed.list).toEqual(['a', 'b']);
  });

  it('preserves apostrophes inside double-quoted strings', () => {
    const raw = '{ "units": [{ "summary": "Today\'s class, students\' work." }] }';
    const cleaned = cleanAiJson(raw);
    const parsed = JSON.parse(cleaned);
    expect(parsed.units[0].summary).toBe("Today's class, students' work.");
  });

  it('still repairs single-quoted JSON values', () => {
    const raw = "{ 'title': 'Intro to Robots', 'count': 3 }";
    const cleaned = cleanAiJson(raw);
    const parsed = JSON.parse(cleaned);
    expect(parsed.title).toBe('Intro to Robots');
    expect(parsed.count).toBe(3);
  });

  it('returns empty string when no JSON structure exists', () => {
    expect(cleanAiJson('Sorry, I cannot help with that.')).toBe('');
    expect(cleanAiJson('')).toBe('');
  });
});
