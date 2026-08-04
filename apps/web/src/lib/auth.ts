import { compare } from 'bcryptjs';
import NextAuth, { type NextAuthConfig } from 'next-auth';
import Credentials from 'next-auth/providers/credentials';
import GitHub from 'next-auth/providers/github';

import { credentialsSchema } from './auth-validation';
import { db } from './db';

const providers: NextAuthConfig['providers'] = [
  Credentials({
    credentials: {
      email: { label: 'Email', type: 'email' },
      password: { label: 'Password', type: 'password' },
    },
    async authorize(rawCredentials) {
      const parsed = credentialsSchema.safeParse(rawCredentials);
      if (!parsed.success) {
        return null;
      }

      const user = await db.user.findUnique({
        where: { email: parsed.data.email },
      });

      if (!user?.email || !user.passwordHash) {
        return null;
      }

      const passwordMatches = await compare(parsed.data.password, user.passwordHash);
      if (!passwordMatches) {
        return null;
      }

      return {
        id: user.id,
        email: user.email,
        name: user.name,
      };
    },
  }),
];

if (process.env.GITHUB_ID?.trim() && process.env.GITHUB_SECRET?.trim()) {
  providers.push(
    GitHub({
      clientId: process.env.GITHUB_ID,
      clientSecret: process.env.GITHUB_SECRET,
    }),
  );
}

const localDevelopmentSecret = 'yilink-local-development-only-change-me';

export const { handlers, signIn, signOut, auth } = NextAuth({
  providers,
  secret:
    process.env.AUTH_SECRET ??
    (process.env.NODE_ENV === 'production' ? undefined : localDevelopmentSecret),
  trustHost: true,
  session: {
    strategy: 'jwt',
  },
  pages: {
    signIn: '/login',
  },
  callbacks: {
    async signIn({ user, account }) {
      if (account?.provider !== 'github') {
        return true;
      }

      if (!user.email) {
        return false;
      }

      const email = user.email.trim().toLowerCase();
      const githubId = account.providerAccountId;
      const existing = await db.user.findFirst({
        where: {
          OR: [{ githubId }, { email }],
        },
      });

      const persistedUser = existing
        ? await db.user.update({
            where: { id: existing.id },
            data: {
              email,
              githubId,
              name: user.name ?? existing.name,
            },
          })
        : await db.user.create({
            data: {
              email,
              githubId,
              name: user.name,
            },
          });

      user.id = persistedUser.id;
      return true;
    },
    async jwt({ token, user }) {
      if (user?.id) {
        token.sub = user.id;
      }

      return token;
    },
    async session({ session, token }) {
      if (session.user && token.sub) {
        session.user.id = token.sub;
      }

      return session;
    },
  },
});
