import { FetchCreateContextFnOptions } from '@trpc/server/adapters/fetch';
import connectDB from '@/lib/db';
import { verifyToken } from '@/lib/utils/jwt';

export async function createContext(opts: FetchCreateContextFnOptions) {
  // Connect to database
  await connectDB();

  // Try to get JWT from cookies
  let userId: string | null = null;
  let username: string | null = null;

  const cookieHeader = opts.req.headers.get('cookie');
  if (cookieHeader) {
    const cookies = parseCookies(cookieHeader);
    const token = cookies['fittrack-token'];

    if (token) {
      const payload = verifyToken(token);
      if (payload) {
        userId = payload.userId;
        username = payload.username;
      }
    }
  }

  return {
    userId,
    username,
    req: opts.req,
    resHeaders: opts.resHeaders,
  };
}

export type Context = Awaited<ReturnType<typeof createContext>>;

// Helper function to parse cookies
function parseCookies(cookieHeader: string): Record<string, string> {
  return cookieHeader.split(';').reduce((acc, cookie) => {
    const [key, value] = cookie.trim().split('=');
    if (key && value) {
      acc[key] = decodeURIComponent(value);
    }
    return acc;
  }, {} as Record<string, string>);
}
