import NextAuth from "next-auth";
import type { Provider } from "next-auth/providers";
import Credentials from "next-auth/providers/credentials";
import Google from "next-auth/providers/google";
import { compare } from "bcryptjs";
import { z } from "zod";

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

      // Dynamic import keeps Node fs out of the Edge middleware bundle
      const { findUserByEmail } = await import("@/lib/auth/users");
      const user = await findUserByEmail(parsed.data.email);
      // Google-only accounts have no password to check against
      if (!user?.passwordHash) return null;

      const valid = await compare(parsed.data.password, user.passwordHash);
      if (!valid) return null;

      return { id: user.id, name: user.name, email: user.email, image: user.image };
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
        // Link Google sign-ins to the local user record (matched by email)
        const { upsertOAuthUser } = await import("@/lib/auth/users");
        const stored = await upsertOAuthUser({ name: token.name, email: token.email, image: token.picture });
        token.id = stored.id;
        token.name = stored.name;
      } else if (user) {
        token.id = user.id;
      }
      return token;
    },
    session({ session, token }) {
      if (session.user && token.id) {
        session.user.id = token.id as string;
      }
      return session;
    },
  },
  trustHost: true,
});
