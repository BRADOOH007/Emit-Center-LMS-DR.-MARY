export interface Curriculum {
  id: string;
  name: string;
  country: string;
  subjects: string[];
  grades: string[];
}

export interface Country {
  code: string;
  name: string;
  flag: string;
}

export const COUNTRIES: Country[] = [
  { code: 'US', name: 'United States', flag: '🇺🇸' },
];

export const CURRICULA: Curriculum[] = [
  {
    id: 'common-core',
    name: 'Common Core',
    country: 'US',
    subjects: [
      'Mathematics', 'English Language Arts', 'Science', 'Social Studies',
      'History', 'Geography', 'Economics', 'Art', 'Music',
      'Physical Education', 'Health', 'Spanish', 'French',
      'Computer Science',
    ],
    grades: [
      'Kindergarten', 'Grade 1', 'Grade 2', 'Grade 3', 'Grade 4',
      'Grade 5', 'Grade 6', 'Grade 7', 'Grade 8', 'Grade 9',
      'Grade 10', 'Grade 11', 'Grade 12',
    ],
  },
  {
    id: 'ngss',
    name: 'NGSS (Next Generation Science Standards)',
    country: 'US',
    subjects: [
      'Physical Science', 'Life Science', 'Earth & Space Science',
      'Engineering Design', 'Science & Engineering Practices',
      'Crosscutting Concepts',
    ],
    grades: [
      'Kindergarten', 'Grade 1', 'Grade 2', 'Grade 3', 'Grade 4',
      'Grade 5', 'Grade 6', 'Grade 7', 'Grade 8', 'Grade 9',
      'Grade 10', 'Grade 11', 'Grade 12',
    ],
  },
  {
    id: 'teks',
    name: 'TEKS (Texas Essential Knowledge & Skills)',
    country: 'US',
    subjects: [
      'English Language Arts & Reading', 'Mathematics', 'Science',
      'Social Studies', 'Health Education', 'Physical Education',
      'Fine Arts', 'Languages Other Than English', 'Technology Applications',
      'Career & Technical Education', 'Economics',
    ],
    grades: [
      'Kindergarten', 'Grade 1', 'Grade 2', 'Grade 3', 'Grade 4',
      'Grade 5', 'Grade 6', 'Grade 7', 'Grade 8', 'Grade 9',
      'Grade 10', 'Grade 11', 'Grade 12',
    ],
  },
  {
    id: 'florida-best',
    name: 'Florida B.E.S.T. Standards',
    country: 'US',
    subjects: [
      'English Language Arts', 'Mathematics', 'Science', 'Social Studies',
      'Health & PE', 'Fine Arts', 'World Languages', 'Computer Science',
      'Career & Technical Education',
    ],
    grades: [
      'Kindergarten', 'Grade 1', 'Grade 2', 'Grade 3', 'Grade 4',
      'Grade 5', 'Grade 6', 'Grade 7', 'Grade 8', 'Grade 9',
      'Grade 10', 'Grade 11', 'Grade 12',
    ],
  },
  {
    id: 'california',
    name: 'California Content Standards',
    country: 'US',
    subjects: [
      'English Language Arts', 'Mathematics', 'Science', 'History-Social Science',
      'Health Education', 'Physical Education', 'Visual & Performing Arts',
      'World Languages', 'Computer Science',
    ],
    grades: [
      'Kindergarten', 'Grade 1', 'Grade 2', 'Grade 3', 'Grade 4',
      'Grade 5', 'Grade 6', 'Grade 7', 'Grade 8', 'Grade 9',
      'Grade 10', 'Grade 11', 'Grade 12',
    ],
  },
  {
    id: 'ny-state',
    name: 'New York State Standards',
    country: 'US',
    subjects: [
      'English Language Arts', 'Mathematics', 'Science', 'Social Studies',
      'The Arts', 'Health & Physical Education', 'World Languages',
      'Career Development', 'Computer Science & Digital Fluency',
    ],
    grades: [
      'Kindergarten', 'Grade 1', 'Grade 2', 'Grade 3', 'Grade 4',
      'Grade 5', 'Grade 6', 'Grade 7', 'Grade 8', 'Grade 9',
      'Grade 10', 'Grade 11', 'Grade 12',
    ],
  },
  {
    id: 'ap',
    name: 'Advanced Placement (AP)',
    country: 'US',
    subjects: [
      'AP Biology', 'AP Chemistry', 'AP Physics 1', 'AP Physics 2',
      'AP Physics C', 'AP Calculus AB', 'AP Calculus BC', 'AP Statistics',
      'AP English Language & Composition', 'AP English Literature & Composition',
      'AP United States History', 'AP World History', 'AP European History',
      'AP US Government & Politics', 'AP Human Geography', 'AP Psychology',
      'AP Macroeconomics', 'AP Microeconomics', 'AP Computer Science A',
      'AP Computer Science Principles', 'AP Environmental Science',
      'AP Art History', 'AP Studio Art', 'AP Music Theory',
      'AP Spanish Language & Culture', 'AP French Language & Culture',
    ],
    grades: ['Grade 9', 'Grade 10', 'Grade 11', 'Grade 12'],
  },
  {
    id: 'ged-hiset',
    name: 'GED / HiSET (High School Equivalency)',
    country: 'US',
    subjects: [
      'Mathematical Reasoning', 'Reasoning Through Language Arts',
      'Science', 'Social Studies',
    ],
    grades: ['Adult Learner', 'High School Equivalency'],
  },
  {
    id: 'us-homeschool',
    name: 'Homeschool / Custom',
    country: 'US',
    subjects: [
      'Mathematics', 'English Language Arts', 'Science', 'Social Studies',
      'History', 'Geography', 'Economics', 'Art', 'Music',
      'Physical Education', 'Health', 'Foreign Languages',
      'Computer Science', 'Life Skills',
    ],
    grades: [
      'Kindergarten', 'Grade 1', 'Grade 2', 'Grade 3', 'Grade 4',
      'Grade 5', 'Grade 6', 'Grade 7', 'Grade 8', 'Grade 9',
      'Grade 10', 'Grade 11', 'Grade 12',
    ],
  },
];

export function getCurriculaByCountry(countryCode: string): Curriculum[] {
  return CURRICULA.filter((c) => c.country === countryCode);
}

export function getCurriculum(id: string): Curriculum | undefined {
  return CURRICULA.find((c) => c.id === id);
}

export function getSubjectsForCurriculum(id: string): string[] {
  const curriculum = getCurriculum(id);
  return curriculum?.subjects ?? [];
}

export function getGradesForCurriculum(id: string): string[] {
  const curriculum = getCurriculum(id);
  return curriculum?.grades ?? [];
}