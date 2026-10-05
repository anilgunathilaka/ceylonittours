import NextAuth from "next-auth";
import type { Provider } from "next-auth/providers";
import Credentials from "next-auth/providers/credentials";
import Google from "next-auth/providers/google";
import { compare } from "bcryptjs";
import { z } from "zod";
import { isAdminEmail } from "@/lib/auth/roles";

const credentialsSchema = z.object({
  email: z.string().email(),
  password: z.string().min(8),
});

export const isGoogleAuthEnabled = Boolean(process.env.AUTH_GOOGLE_ID && process.env.AUTH_GOOGLE_SECRET);

const providers: Provider[] = [
  Credentials({
    credentials: {
      email: { label: "Email", type: "email" },
      password: { label: "Password", type: "password" },
    },
    authorize: async (credentials) => {
      const parsed = credentialsSchema.safeParse(credentials);
      if (!parsed.success) return null;

      // Dynamic import keeps the database client out of any bundle that only needs auth config
      const { findUserForLogin } = await import("@/lib/auth/users");
      const user = await findUserForLogin(parsed.data.email);
      // Google-only accounts have no password to check against
      if (!user?.passwordHash) return null;

      const valid = await compare(parsed.data.password, user.passwordHash);
      if (!valid) return null;

      return { id: user.id, name: user.name, email: user.email, image: user.image ?? undefined };
    },
  }),
];

// Google reads AUTH_GOOGLE_ID / AUTH_GOOGLE_SECRET from the environment
if (isGoogleAuthEnabled) {
  providers.push(Google);
}

export const { handlers, auth, signIn, signOut } = NextAuth({
  providers,
  session: { strategy: "jwt" },
  pages: {
    signIn: "/login",
    error: "/login",
  },
  callbacks: {
    signIn({ account, profile }) {
      if (account?.provider === "google") {
        return Boolean(profile?.email && profile.email_verified);
      }
      return true;
    },
    async jwt({ token, user, account }) {
      if (account?.provider === "google" && token.email) {
        // Link the Google account to the local user (matched by verified email, no duplicates)
        const { upsertGoogleUser } = await import("@/lib/auth/users");
        const stored = await upsertGoogleUser({
          providerAccountId: account.providerAccountId,
          email: token.email,
          name: token.name,
          image: token.picture,
        });
        token.id = stored.id;
        token.name = stored.name;
      } else if (user) {
        token.id = user.id;
      }
      // Re-evaluated on every token refresh so ADMIN_EMAILS changes apply without re-login
      token.isAdmin = isAdminEmail(token.email);
      return token;
    },
    session({ session, token }) {
      if (session.user && token.id) {
        session.user.id = token.id as string;
      }
      if (session.user) {
        session.user.isAdmin = Boolean(token.isAdmin);
      }
      return session;
    },
  },
  trustHost: true,
});
