import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';

/** Resolves the signed-in user's id and GitHub access token, or null if unauthenticated. */
export async function getAuthedUser(): Promise<{ userId: string; githubAccessToken?: string } | null> {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) return null;
  return { userId: session.user.id, githubAccessToken: session.accessToken };
}
