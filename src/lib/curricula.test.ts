import { describe, it, expect } from 'vitest';
import {
  CURRICULA,
  COUNTRIES,
  getCurriculaByCountry,
  getCurriculum,
  getSubjectsForCurriculum,
  getGradesForCurriculum,
} from '@/lib/curricula';
import {
  getCurriculumProfile,
  buildCurriculumLessonContext,
  buildCurriculumAssessmentContext,
  DEFAULT_CURRICULUM,
  DEFAULT_COUNTRY,
} from '@/lib/curriculum-prompt';

describe('curricula (US only)', () => {
  it('only exposes the United States country', () => {
    expect(COUNTRIES.map((c) => c.code)).toEqual(['US']);
    expect(COUNTRIES[0].flag).toBe('🇺🇸');
  });

  it('includes all US curricula and no non-US ones', () => {
    const ids = CURRICULA.map((c) => c.id);
    expect(ids).not.toContain('cbc');
    expect(ids).not.toContain('8-4-4');
    expect(ids).not.toContain('cambridge');
    expect(ids).toContain('common-core');
    expect(ids).toContain('ngss');
    expect(ids).toContain('teks');
    expect(ids).toContain('florida-best');
    expect(ids).toContain('california');
    expect(ids).toContain('ny-state');
    expect(ids).toContain('ap');
    expect(ids).toContain('ged-hiset');
    expect(ids).toContain('us-homeschool');
  });

  it('every curriculum belongs to the US', () => {
    for (const c of CURRICULA) expect(c.country).toBe('US');
  });

  it('common-core exposes US grade levels and subjects', () => {
    const cc = getCurriculum('common-core');
    expect(cc).toBeDefined();
    expect(cc!.grades).toContain('Grade 5');
    expect(cc!.grades).toContain('Grade 12');
    expect(cc!.subjects).toContain('Mathematics');
    expect(cc!.subjects).toContain('English Language Arts');
  });

  it('filters by country', () => {
    const us = getCurriculaByCountry('US');
    expect(us.length).toBe(CURRICULA.length);
    expect(getCurriculaByCountry('KE')).toEqual([]);
  });

  it('returns subjects and grades for a curriculum', () => {
    expect(getSubjectsForCurriculum('ap')).toContain('AP Calculus AB');
    expect(getGradesForCurriculum('ged-hiset')).toEqual(['Adult Learner', 'High School Equivalency']);
  });

  it('defaults to common-core when no curriculum is given', () => {
    expect(DEFAULT_CURRICULUM).toBe('common-core');
    expect(DEFAULT_COUNTRY).toBe('US');
    const profile = getCurriculumProfile();
    expect(profile.country).toBe('US');
    expect(profile.id).toBe('us-generic');
  });

  it('falls back to a US profile for unknown ids', () => {
    const profile = getCurriculumProfile('does-not-exist');
    expect(profile.country).toBe('US');
    expect(profile.strandLabel).toBeDefined();
  });

  it('builds a US-flavoured lesson context without CBC terminology', () => {
    const ctx = buildCurriculumLessonContext({
      curriculum: 'common-core',
      grade: 'Grade 7',
      subject: 'Mathematics',
    });
    expect(ctx).toContain('United States');
    expect(ctx).toContain('Unit');
    expect(ctx).not.toContain('Sub-Strand');
    expect(ctx).not.toContain('KICD');
    expect(ctx).not.toContain('learner should be able to');
  });

  it('builds assessment context using US assessment style', () => {
    const ctx = buildCurriculumAssessmentContext({ curriculum: 'ngss', grade: 'Grade 6', subject: 'Life Science' });
    expect(ctx).toContain('NGSS-aligned assessment');
    expect(ctx).toContain('phenomenon-based');
  });

  it('uses common-core terminology for the profile', () => {
    const cc = getCurriculumProfile('common-core');
    expect(cc.strandLabel).toBe('Domain');
    expect(cc.subStrandLabel).toBe('Cluster / Standard');
    expect(cc.objectiveStem).toBe('By the end of the lesson, students will be able to');
    expect(cc.termLabel).toBe('Marking Period');
    expect(cc.lessonDurationMinutes).toBe(45);
  });
});