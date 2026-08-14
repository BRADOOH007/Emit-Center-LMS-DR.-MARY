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
  'c3-social-studies': {
    ...US_BASE,
    id: 'c3-social-studies',
    name: 'C3 Framework for Social Studies',
    identity:
      'an expert social studies educator and curriculum designer specializing in the College, Career, and Civic Life (C3) Framework for inquiry-based social studies.',
    contextNote:
      'Anchor social studies learning in compelling and supporting questions. Structure work around the Inquiry Arc: developing questions, applying disciplinary tools, evaluating sources, communicating conclusions, and taking informed action across civics, economics, geography, and history.',
    strandLabel: 'Discipline / Dimension',
    subStrandLabel: 'Indicator / Standard',
    valuesGuidance:
      'Foster civic engagement, evidence-based reasoning, multiple perspectives, and informed, responsible citizenship.',
    competenciesGuidance:
      'Build disciplinary literacy and inquiry practices: questioning, sourcing, corroboration, argumentation, and civic action.',
  },
  iste: {
    ...US_BASE,
    id: 'iste',
    name: 'ISTE Standards for Students',
    identity:
      'an expert technology and media educator specializing in the ISTE Standards for Students for digital-age learning.',
    contextNote:
      'Focus on the seven ISTE student standards: Empowered Learner, Digital Citizen, Knowledge Constructor, Innovative Designer, Computational Thinker, Creative Communicator, and Global Collaborator.',
    strandLabel: 'Standard',
    subStrandLabel: 'Indicator',
    assessmentStyle:
      'Portfolio- and performance-based assessment: digital products, reflections, and authentic project work.',
    valuesGuidance:
      'Promote responsible digital citizenship, ethical technology use, and a healthy relationship with media.',
    competenciesGuidance:
      'Develop digital-age skills: creative problem solving, safe online behavior, media literacy, and responsible collaboration.',
  },
  'ib-programme': {
    ...US_BASE,
    id: 'ib-programme',
    name: 'International Baccalaureate (IB)',
    identity:
      'an expert International Baccalaureate educator and curriculum designer (IB PYP, MYP, and DP).',
    contextNote:
      'Use IB terminology: approaches to learning (ATL), concepts, global contexts, key and related concepts, inquiry-based units of study, the learner profile, assessment criteria, and internal/external assessment. Support students working toward the IB Diploma or MYP certification.',
    strandLabel: 'Unit / Statement of Inquiry',
    subStrandLabel: 'Criterion / Assessment Task',
    assessmentStyle:
      'IB-style assessment against published criteria, with task-specific clarifications and rubrics.',
    valuesGuidance:
      'Embody the IB learner profile: inquirers, knowledgeable, thinkers, communicators, principled, open-minded, caring, risk-takers, balanced, reflective.',
    competenciesGuidance:
      'Build approaches to learning: thinking, communication, social, self-management, and research skills.',
    lessonDurationMinutes: 60,
  },
  'wida-esol': {
    ...US_BASE,
    id: 'wida-esol',
    name: 'WIDA ELD Standards / ESL',
    identity:
      'an expert English language development (ELD) educator specializing in the WIDA English Language Development Standards Framework for multilingual learners.',
    contextNote:
      'Use the WIDA framework: the four language domains (listening, speaking, reading, writing) across six proficiency levels (Entering through Reaching), and integrate language development into content-area learning.',
    strandLabel: 'Grade-level Cluster',
    subStrandLabel: 'Language Function / Standard',
    assessmentStyle:
      'Access for ELLs-aligned assessment and formative observation of language production.',
    valuesGuidance:
      'Affirm students&apos; home languages and cultures; build confidence in using English academically and socially.',
    competenciesGuidance:
      'Develop academic language across content areas, with scaffolds and differentiation for multilingual learners.',
  },
  cte: {
    ...US_BASE,
    id: 'cte',
    name: 'Career & Technical Education (CTE)',
    identity:
      'an expert Career and Technical Education (CTE) educator and program designer for US career pathways.',
    contextNote:
      'Use the national career clusters and pathways framework (Agriculture, Business, Health Science, Information Technology, STEM, Arts/A/V, etc.), plus state CTE programs of study and industry-recognized credentials.',
    strandLabel: 'Career Cluster',
    subStrandLabel: 'Pathway / Standard',
    assessmentStyle:
      'Performance-based and industry-recognized assessments, portfolios of evidence, and work-based learning.',
    valuesGuidance:
      'Develop professionalism, work ethic, teamwork, and career readiness for all students.',
    competenciesGuidance:
      'Build career-ready skills: technical competence, employability skills, financial literacy, and workplace communication.',
  },
};

export const US_STATE_STANDARDS: Record<
  string,
  { fullName: string; abbr: string; standards: string }
> = {
  alabama: { fullName: 'Alabama', abbr: 'AL', standards: 'Alabama Course of Study' },
  alaska: { fullName: 'Alaska', abbr: 'AK', standards: 'Alaska Content Standards' },
  arizona: { fullName: 'Arizona', abbr: 'AZ', standards: "Arizona's College and Career Ready Standards" },
  arkansas: { fullName: 'Arkansas', abbr: 'AR', standards: 'Arkansas Academic Standards' },
  california: { fullName: 'California', abbr: 'CA', standards: 'California Content Standards (CA Common Core, CA NGSS, History-Social Science Framework)' },
  colorado: { fullName: 'Colorado', abbr: 'CO', standards: 'Colorado Academic Standards' },
  connecticut: { fullName: 'Connecticut', abbr: 'CT', standards: 'Connecticut Core Standards' },
  delaware: { fullName: 'Delaware', abbr: 'DE', standards: 'Delaware Content Standards' },
  'district-of-columbia': { fullName: 'District of Columbia', abbr: 'DC', standards: 'District of Columbia Academic Standards' },
  florida: { fullName: 'Florida', abbr: 'FL', standards: 'Florida B.E.S.T. Standards' },
  georgia: { fullName: 'Georgia', abbr: 'GA', standards: 'Georgia Standards of Excellence (GSE)' },
  hawaii: { fullName: 'Hawaii', abbr: 'HI', standards: 'Hawaii Content & Performance Standards III' },
  idaho: { fullName: 'Idaho', abbr: 'ID', standards: 'Idaho Content Standards' },
  illinois: { fullName: 'Illinois', abbr: 'IL', standards: 'Illinois Learning Standards (CCSS and NGSS adoptions)' },
  indiana: { fullName: 'Indiana', abbr: 'IN', standards: 'Indiana Academic Standards' },
  iowa: { fullName: 'Iowa', abbr: 'IA', standards: 'Iowa Academic Standards (Iowa Core)' },
  kansas: { fullName: 'Kansas', abbr: 'KS', standards: 'Kansas College and Career Ready Standards' },
  kentucky: { fullName: 'Kentucky', abbr: 'KY', standards: 'Kentucky Academic Standards' },
  louisiana: { fullName: 'Louisiana', abbr: 'LA', standards: 'Louisiana Student Standards' },
  maine: { fullName: 'Maine', abbr: 'ME', standards: 'Maine Learning Results' },
  maryland: { fullName: 'Maryland', abbr: 'MD', standards: 'Maryland College and Career Ready Standards' },
  massachusetts: { fullName: 'Massachusetts', abbr: 'MA', standards: 'Massachusetts Curriculum Frameworks' },
  michigan: { fullName: 'Michigan', abbr: 'MI', standards: 'Michigan Academic Standards' },
  minnesota: { fullName: 'Minnesota', abbr: 'MN', standards: 'Minnesota Academic Standards' },
  mississippi: { fullName: 'Mississippi', abbr: 'MS', standards: 'Mississippi College- and Career-Readiness Standards' },
  missouri: { fullName: 'Missouri', abbr: 'MO', standards: 'Missouri Learning Standards' },
  montana: { fullName: 'Montana', abbr: 'MT', standards: 'Montana Content Standards' },
  nebraska: { fullName: 'Nebraska', abbr: 'NE', standards: 'Nebraska College and Career Ready Standards' },
  nevada: { fullName: 'Nevada', abbr: 'NV', standards: 'Nevada Academic Content Standards' },
  'new-hampshire': { fullName: 'New Hampshire', abbr: 'NH', standards: 'New Hampshire College and Career Ready Standards' },
  'new-jersey': { fullName: 'New Jersey', abbr: 'NJ', standards: 'New Jersey Student Learning Standards (NJSLS)' },
  'new-mexico': { fullName: 'New Mexico', abbr: 'NM', standards: 'New Mexico Common Core State Standards' },
  'new-york': { fullName: 'New York', abbr: 'NY', standards: 'New York State Next Generation Learning Standards' },
  'north-carolina': { fullName: 'North Carolina', abbr: 'NC', standards: 'North Carolina Standard Course of Study' },
  'north-dakota': { fullName: 'North Dakota', abbr: 'ND', standards: 'North Dakota Content Standards' },
  ohio: { fullName: 'Ohio', abbr: 'OH', standards: "Ohio's Learning Standards" },
  oklahoma: { fullName: 'Oklahoma', abbr: 'OK', standards: 'Oklahoma Academic Standards' },
  oregon: { fullName: 'Oregon', abbr: 'OR', standards: 'Oregon Academic Content Standards' },
  pennsylvania: { fullName: 'Pennsylvania', abbr: 'PA', standards: 'Pennsylvania Academic Standards (PA Core)' },
  'rhode-island': { fullName: 'Rhode Island', abbr: 'RI', standards: 'Rhode Island Core Standards' },
  'south-carolina': { fullName: 'South Carolina', abbr: 'SC', standards: 'South Carolina College- and Career-Ready Standards' },
  'south-dakota': { fullName: 'South Dakota', abbr: 'SD', standards: 'South Dakota Content Standards' },
  tennessee: { fullName: 'Tennessee', abbr: 'TN', standards: 'Tennessee Academic Standards' },
  texas: { fullName: 'Texas', abbr: 'TX', standards: 'Texas Essential Knowledge and Skills (TEKS)' },
  utah: { fullName: 'Utah', abbr: 'UT', standards: 'Utah Core Standards' },
  vermont: { fullName: 'Vermont', abbr: 'VT', standards: 'Vermont Framework of Standards' },
  virginia: { fullName: 'Virginia', abbr: 'VA', standards: 'Virginia Standards of Learning (SOL)' },
  washington: { fullName: 'Washington', abbr: 'WA', standards: 'Washington State K-12 Learning Standards' },
  'west-virginia': { fullName: 'West Virginia', abbr: 'WV', standards: 'West Virginia College- and Career-Readiness Standards' },
  wisconsin: { fullName: 'Wisconsin', abbr: 'WI', standards: 'Wisconsin Academic Standards' },
  wyoming: { fullName: 'Wyoming', abbr: 'WY', standards: 'Wyoming Content and Performance Standards' },
};

function buildStateProfile(stateId: string): CurriculumPromptProfile {
  const meta = US_STATE_STANDARDS[stateId];
  return {
    ...US_BASE,
    id: stateId,
    name: meta.standards,
    identity: `an expert educator and curriculum designer specializing in the ${meta.standards} for ${meta.fullName} schools.`,
    contextNote: `Use ${meta.fullName} and United States contexts throughout: local history, geography, cities, and culture where relevant, plus USD and US resources. Align all content to the ${meta.standards} for the given grade and subject.`,
  };
}

function normalizeKey(value: string): string {
  return value.trim().toLowerCase().replace(/[^a-z]/g, '');
}

export function lookupStateProfile(query?: string | null): CurriculumPromptProfile | null {
  if (!query) return null;
  const q = normalizeKey(query);
  if (!q) return null;
  const entry = Object.entries(US_STATE_STANDARDS).find(
    ([id, meta]) => id === q || meta.abbr.toLowerCase() === q || normalizeKey(meta.fullName) === q,
  );
  return entry ? buildStateProfile(entry[0]) : null;
}

export function buildUSCurriculumKnowledge(): string {
  return `US EDUCATION KNOWLEDGE BASE — You are knowledgeable about ALL curricula used across the United States and its territories. When a student asks any learning-related question, use whichever framework best fits their state, grade, and subject, and note relevant state variations.

KEY FRAMEWORKS:
- ELA & Mathematics: Common Core State Standards (CCSS), adopted or adapted by most states. Each state publishes its own version — e.g., Texas TEKS, Florida B.E.S.T., New York Next Generation Learning Standards, Virginia SOL, Georgia GSE, Massachusetts Curriculum Frameworks, North Carolina Standard Course of Study, New Jersey Student Learning Standards, Pennsylvania Academic/PA Core Standards, California Common Core.
- Science: Next Generation Science Standards (NGSS), adopted or adapted by roughly 20 states and DC; other states keep their own frameworks (Texas, Florida, New York, Virginia, Georgia, Massachusetts, and others). NGSS anchors learning in real-world phenomena and uses three dimensions: Disciplinary Core Ideas (DCIs), Science & Engineering Practices (SEPs), and Crosscutting Concepts (CCCs).
- Social Studies: the College, Career, and Civic Life (C3) Framework and NCSS themes, plus state-specific standards for history, geography, civics/government, and economics (e.g., Texas TEKS, California History-Social Science Framework, Virginia SOL, New York Framework, Florida Social Studies).
- Technology & Computer Science: ISTE Standards for Students, the K-12 Computer Science Framework, and state computer-science standards.
- Career & Technical Education (CTE): national career clusters and pathways with state programs of study and industry-recognized credentials.
- English learners: WIDA ELD Standards Framework and state ESL/ELD programs.
- Assessments: state tests (e.g., STAAR in TX, B.E.S.T. assessments in FL, NYSTP in NY, MCAS in MA, CAASPP in CA, SOL in VA) plus national exams — SAT, ACT, PSAT, AP, IB, and GED/HiSET for high school equivalency.

US GRADE BANDS: Elementary (K-5), Middle (6-8), High (9-12). Standards are typically written for each grade K-8 and by course/grade band for 9-12.

RULES:
1. If the student names a state, reference that state's standards. If they name a grade, use the matching grade band.
2. If a question spans subjects (e.g., science writing), use the relevant framework for each part.
3. For general questions, align to the most widely used frameworks (CCSS for ELA/Math, NGSS for Science, C3 for Social Studies) and mention major state differences where useful.
4. Always answer from a US classroom perspective, using US grade levels, terminology, currency, and examples.`;
}

export const DEFAULT_CURRICULUM = 'common-core';
export const DEFAULT_COUNTRY = 'US';

const FALLBACK: CurriculumPromptProfile = PROFILES['us-generic'];

export function getCurriculumProfile(
  curriculumId?: string | null,
  country?: string | null,
): CurriculumPromptProfile {
  if (curriculumId && PROFILES[curriculumId]) return PROFILES[curriculumId];
  const stateProfile = lookupStateProfile(curriculumId);
  if (stateProfile) return stateProfile;
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