const ADJECTIVES = ['Blue', 'Green', 'Happy', 'Brave', 'Swift', 'Bright', 'Calm', 'Bold', 'Clever', 'Golden'];
const NOUNS = ['Lion', 'Star', 'River', 'Eagle', 'Mountain', 'Sunrise', 'Ocean', 'Forest', 'Tiger', 'Falcon'];

export function generatePassword(): string {
  const adjective = ADJECTIVES[Math.floor(Math.random() * ADJECTIVES.length)];
  const noun = NOUNS[Math.floor(Math.random() * NOUNS.length)];
  const number = Math.floor(100 + Math.random() * 900);
  return `${adjective}${noun}${number}`;
}

function clean(part: string): string {
  return part.toLowerCase().replace(/[^a-z0-9]/g, '');
}

export function splitFullName(fullName: string): { first: string; last: string } {
  const parts = fullName.trim().split(/\s+/).filter(Boolean);
  return { first: parts[0] ?? '', last: parts.slice(1).join(' ') };
}

export function generateUsername(first: string, last: string, suffix?: string): string {
  const base = `${clean(first)}.${clean(last)}`;
  return suffix ? `${base}.${suffix}` : base;
}

export function generateUsernameFromFullName(fullName: string, suffix?: string): string {
  const { first, last } = splitFullName(fullName);
  const base = generateUsername(first || 'user', last);
  return suffix ? `${base}.${suffix}` : base;
}

export async function ensureUniqueUsername(
  fullName: string,
  isTaken: (username: string) => Promise<boolean>,
): Promise<string> {
  let username = generateUsernameFromFullName(fullName);
  let attempt = 0;
  while (await isTaken(username)) {
    attempt += 1;
    username = generateUsernameFromFullName(fullName, `${Math.floor(100 + Math.random() * 900)}${attempt}`);
  }
  return username;
}
