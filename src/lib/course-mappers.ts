import type { AgeLevel, CourseSubject, DeliveryFormat } from '@/types';

export function appSubjectToDb(subject: CourseSubject): 'robotics' | 'coding' | 'design' | 'life_skills' | 'engineering' | 'career' {
  return subject === 'life-skills' ? 'life_skills' : subject;
}

export function dbSubjectToApp(subject: 'robotics' | 'coding' | 'design' | 'life_skills' | 'engineering' | 'career'): CourseSubject {
  return subject === 'life_skills' ? 'life-skills' : subject;
}

export function appFormatToDb(format: DeliveryFormat): 'onsite' | 'online' | 'hybrid' {
  return format;
}

export function dbFormatToApp(format: 'onsite' | 'online' | 'hybrid'): DeliveryFormat {
  return format;
}

export function appAgeLevelToDb(ageLevel: AgeLevel): 'elementary' | 'middle' | 'high' | 'adult' | 'all' {
  return ageLevel;
}

export function dbAgeLevelToApp(ageLevel: 'elementary' | 'middle' | 'high' | 'adult' | 'all'): AgeLevel {
  return ageLevel;
}
