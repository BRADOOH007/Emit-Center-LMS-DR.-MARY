import { MOCK_ANALYTICS } from '@/lib/mock-data';
import { ok } from '@/lib/api-helpers';

export async function GET() {
  return ok(MOCK_ANALYTICS);
}
