export async function fetchWithTimeout(
  url: string,
  options: RequestInit = {},
  timeoutMs: number = 15_000
): Promise<Response> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);

  try {
    const response = await fetch(url, {
      ...options,
      signal: controller.signal,
    });
    return response;
  } finally {
    clearTimeout(timer);
  }
}

export function withTimeout<T>(promise: Promise<T>, timeoutMs: number): Promise<T> {
  return new Promise((resolve, reject) => {
    const timer = setTimeout(() => reject(new Error('TIMEOUT')), timeoutMs);
    promise.then(
      (v) => { clearTimeout(timer); resolve(v); },
      (e) => { clearTimeout(timer); reject(e); },
    );
  });
}

export const TIMEOUTS = {
  AI: 60_000,
  IMAGE: 15_000,
  PAYMENT: 20_000,
  DEFAULT: 10_000,
  FAST: 5_000,
} as const;
