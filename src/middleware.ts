import { withAuth } from 'next-auth/middleware';

export default withAuth({
  pages: {
    signIn: '/signin',
  },
});

export const config = {
  // Protect all app pages; API routes guard themselves (return 401 JSON) and
  // NextAuth's own /api/auth endpoints must stay open for the sign-in flow to work.
  matcher: ['/((?!api|_next|signin|favicon.ico).*)'],
};
