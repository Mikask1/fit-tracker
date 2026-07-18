// Connectivity probe used by the offline sync engine. Must never be cached —
// a cached 204 would make a dead connection look healthy.
export const dynamic = 'force-dynamic';

export async function GET() {
  return new Response(null, {
    status: 204,
    headers: { 'Cache-Control': 'no-store' },
  });
}
