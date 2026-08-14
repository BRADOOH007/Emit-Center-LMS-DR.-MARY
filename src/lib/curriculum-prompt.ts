export interface CurriculumPromptProfile {
  id: string;
  name: string;
  country: string;
  identity: string;
  contextNote: string;
  strandLabel: string;
  subStrandLabel: string;
  objectiveStem: string;
  assessmentStyle: string;
  lessonDurationMinutes: number;
  defaultLessonsPerWeek: number;
  termLabel: string;
  valuesGuidance: string;
  competenciesGuidance: string;
}

const US_BASE = {
  country: 'US',
  contextNote:
    'Use United States contexts throughout: USD currency, US states and cities, American cultural references, US geography, and locally available US classroom resources. Refer to grade levels as Grade K-12 (or the specific US grade band given).',
  strandLabel: 'Unit',
  subStrandLabel: 'Topic / Standard',
  objectiveStem: 'By the end of the lesson, students will be able to',
  assessmentStyle:
    'US classroom assessment style: formative checks, exit tickets, quizzes, and standards-aligned summative tasks. Avoid terminology specific to other national systems.',
  lessonDurationMinutes: 45,
  defaultLessonsPerWeek: 5,
  termLabel: 'Marking Period',
  valuesGuidance:
    'Reinforce US civic and character values such as responsibility, respect, integrity, citizenship, and teamwork, integrated naturally into the lesson.',
  competenciesGuidance:
    'Weave 21st-century skills into activities where they genuinely apply: critical thinking, collaboration, creativity, communication, and digital literacy.',
};

const US_GENERIC: CurriculumPromptProfile = {
  ...US_BASE,
  id: 'us-generic',
  name: 'United States Standards',
  identity: 'an expert educator and curriculum designer for United States classrooms.',
};

const PROFILES: Record<string, CurriculumPromptProfile> = {
  'us-generic': US_GENERIC,
  'common-core': {
    ...US_BASE,
    id: 'common-core',
    name: 'Common Core State Standards',
    identity:
      'an expert educator and curriculum designer specializing in the Common Core State Standards (CCSS) for English Language Arts and Mathematics used across United States schools.',
    strandLabel: 'Domain',
    subStrandLabel: 'Cluster / Standard',
  },
  ngss: {
    ...US_BASE,
    id: 'ngss',
    name: 'Next Generation Science Standards (NGSS)',
    identity:
      'an expert science educator specializing in the Next Generation Science Standards (NGSS) used across United States schools.',
    contextNote:
      'Use United States contexts and phenomena throughout. Anchor learning in real-world phenomena and problems. Weave the three dimensions together: Disciplinary Core Ideas (DCIs), Science & Engineering Practices (SEPs), and Crosscutting Concepts (CCCs). Refer to grade bands K-2, 3-5, 6-8, 9-12 or the specific grade given.',
    strandLabel: 'Disciplinary Core Idea',
    subStrandLabel: 'Performance Expectation',
    assessmentStyle:
      'NGSS-aligned assessment: phenomenon-based questions, explanation tasks, engineering design tasks, and SEP-focused performance items.',
    valuesGuidance:
      'Encourage curiosity, evidence-based reasoning, environmental stewardship, and ethical use of science.',
    competenciesGuidance:
      'Emphasize Science & Engineering Practices: asking questions, planning investigations, analyzing data, constructing explanations, and using models.',
  },
  teks: {
    ...US_BASE,
    id: 'teks',
    name: 'Texas Essential Knowledge and Skills (TEKS)',
    identity:
      'an expert educator specializing in the Texas Essential Knowledge and Skills (TEKS) standards for Texas public schools.',
    contextNote:
      'Use Texas contexts throughout: Texas history, geography, cities, and culture where relevant, plus USD and US resources. Align content to TEKS student expectations for the given grade and subject.',
  },
  'florida-best': {
    ...US_BASE,
    id: 'florida-best',
    name: 'Florida B.E.S.T. Standards',
    identity:
      'an expert educator specializing in Florida Benchmark for Excellent Student Thinking (B.E.S.T.) standards.',
    contextNote:
      'Use Florida and United States contexts throughout: Florida history, geography and culture where relevant, plus USD and US resources. Align content to Florida B.E.S.T. benchmarks and clarifications for the given grade.',
  },
  california: {
    ...US_BASE,
    id: 'california',
    name: 'California Content Standards',
    identity:
      'an expert educator specializing in the California Content Standards (Common Core CA, NGSS CA, History-Social Science Framework).',
    contextNote:
      'Use California and United States contexts throughout: California geography, history and culture where relevant, plus USD and US resources. Align content to the California Content Standards for the given grade and subject.',
  },
  'ny-state': {
    ...US_BASE,
    id: 'ny-state',
    name: 'New York State Next Generation Learning Standards',
    identity:
      'an expert educator specializing in the New York State Next Generation Learning Standards.',
    contextNote:
      'Use New York and United States contexts throughout: NY geography, history and culture where relevant, plus USD and US resources. Align content to the NYS Next Generation Learning Standards for the given grade.',
  },
  ap: {
    ...US_BASE,
    id: 'ap',
    name: 'Advanced Placement (AP)',
    identity:
      'a college-level Advanced Placement (AP) instructor and curriculum designer for College Board AP courses.',
    contextNote:
      'Use United States contexts and college-level rigor. Align content to the specific AP Course and Exam Description (CED): learning objectives (LOs), essential knowledge (EKs), and skills. Reference the AP exam format for the subject.',
    strandLabel: 'Unit',
    subStrandLabel: 'Topic / Learning Objective',
    assessmentStyle:
      'AP-style assessment: multiple-choice and free-response questions matching the AP exam format, with clear scoring rubrics.',
    lessonDurationMinutes: 50,
    valuesGuidance: 'Model academic integrity, evidence-based argumentation, and disciplined inquiry.',
    competenciesGuidance:
      'Build college-ready skills: source analysis, argumentation, quantitative reasoning, and subject-specific AP skills.',
  },
  'ged-hiset': {
    ...US_BASE,
    id: 'ged-hiset',
    name: 'GED / HiSET (High School Equivalency)',
    identity:
      'an adult education instructor specializing in GED and HiSET high school equivalency test preparation.',
    contextNote:
      'Use real-life, adult-oriented United States contexts: workplace, personal finance (USD), civic life, and everyday problem solving. Target adult learners preparing for the GED or HiSET exam.',
    strandLabel: 'Content Area',
    subStrandLabel: 'Topic / Skill',
    assessmentStyle:
      'GED/HiSET-style assessment: multiple-choice and extended-response items mirroring the four test areas (Mathematical Reasoning, Reasoning Through Language Arts, Science, Social Studies).',
    defaultLessonsPerWeek: 4,
    termLabel: 'Module',
    valuesGuidance: 'Empower adult learners with confidence, persistence, and practical life-skills applications.',
    competenciesGuidance:
      'Develop the skills measured by the GED/HiSET: reasoning through language arts, mathematical reasoning, science practices, and social studies practices.',
  },
  'us-homeschool': {
    ...US_BASE,
    id: 'us-homeschool',
    name: 'Homeschool / Custom',
    identity: 'a flexible, learner-centred educator for United States homeschool families.',
    contextNote:
      'Use United States contexts throughout. Keep materials flexible, multi-age friendly, and adaptable to individual pacing. Suggest hands-on activities suitable for home learning with minimal equipment.',
    assessmentStyle:
      'Homeschool-friendly assessment: portfolios, narration, observation, and informal checks rather than high-stakes exams.',
    defaultLessonsPerWeek: 4,
  },
};

export const DEFAULT_CURRICULUM = 'common-core';
export const DEFAULT_COUNTRY = 'US';

const FALLBACK: CurriculumPromptProfile = PROFILES['us-generic'];

export function getCurriculumProfile(
  curriculumId?: string | null,
  country?: string | null,
): CurriculumPromptProfile {
  if (curriculumId && PROFILES[curriculumId]) return PROFILES[curriculumId];
  if (country) {
    const match = Object.values(PROFILES).find((p) => p.country === country);
    if (match) return match;
  }
  return FALLBACK;
}

export function buildCurriculumLessonContext(opts: {
  curriculum?: string | null;
  country?: string | null;
  grade?: string;
  subject?: string;
}): string {
  const p = getCurriculumProfile(opts.curriculum, opts.country);
  return [
    `CURRICULUM: ${p.name} (${p.country}). You are ${p.identity}`,
    `CONTEXT: ${p.contextNote}`,
    `TERMINOLOGY: In this curriculum, "strand" means ${p.strandLabel} and "subStrand" means ${p.subStrandLabel}. Fill these JSON fields using the correct terminology for ${p.name}.`,
    `OBJECTIVES: Use the stem "${p.objectiveStem}" for learning outcomes.`,
    `VALUES: ${p.valuesGuidance}`,
    `COMPETENCIES: ${p.competenciesGuidance}`,
    `ASSESSMENT: ${p.assessmentStyle}`,
    opts.grade ? `GRADE: ${opts.grade}` : '',
    opts.subject ? `SUBJECT: ${opts.subject}` : '',
    `LESSON DURATION: default ${p.lessonDurationMinutes} minutes per lesson.`,
  ]
    .filter(Boolean)
    .join('\n');
}

export function buildCurriculumUnitPlanContext(opts: {
  curriculum?: string | null;
  country?: string | null;
  grade?: string;
  subject?: string;
}): string {
  const p = getCurriculumProfile(opts.curriculum, opts.country);
  return [
    `CURRICULUM: ${p.name} (${p.country}). You are ${p.identity}`,
    `CONTEXT: ${p.contextNote}`,
    `TERMINOLOGY: In this curriculum, "strand" means ${p.strandLabel} and "subStrand" means ${p.subStrandLabel}. Fill the unit plan columns using the correct terminology for ${p.name}.`,
    `OBJECTIVES: Use the stem "${p.objectiveStem}" for learning outcomes.`,
    `VALUES: ${p.valuesGuidance}`,
    `COMPETENCIES: ${p.competenciesGuidance}`,
    `ASSESSMENT: ${p.assessmentStyle}`,
    opts.grade ? `GRADE: ${opts.grade}` : '',
    opts.subject ? `SUBJECT: ${opts.subject}` : '',
    `TERM: ${p.termLabel} structure. Default ${p.defaultLessonsPerWeek} lessons per week.`,
  ]
    .filter(Boolean)
    .join('\n');
}

export function buildCurriculumAssessmentContext(opts: {
  curriculum?: string | null;
  country?: string | null;
  grade?: string;
  subject?: string;
}): string {
  const p = getCurriculumProfile(opts.curriculum, opts.country);
  return [
    `CURRICULUM: ${p.name} (${p.country}). You are ${p.identity}`,
    `CONTEXT: ${p.contextNote}`,
    `OBJECTIVES: Assess against the stem "${p.objectiveStem}" for this curriculum.`,
    `ASSESSMENT: ${p.assessmentStyle}`,
    opts.grade ? `GRADE: ${opts.grade}` : '',
    opts.subject ? `SUBJECT: ${opts.subject}` : '',
  ]
    .filter(Boolean)
    .join('\n');
}