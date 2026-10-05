import { prisma, isUniqueViolation } from "@/lib/db";

export type PublicUser = {
  id: string;
  name: string;
  email: string;
  image?: string;
};

const normalizeEmail = (email: string) => email.trim().toLowerCase();

/** Full record including the password hash — only for credential checks. */
export async function findUserForLogin(email: string) {
  return prisma.user.findUnique({
    where: { email: normalizeEmail(email) },
    select: { id: true, name: true, email: true, image: true, passwordHash: true },
  });
}

/** Profile data for the signed-in user (never includes the password hash). */
export async function findUserProfile(id: string) {
  const user = await prisma.user.findUnique({
    where: { id },
    select: {
      id: true,
      name: true,
      email: true,
      image: true,
      createdAt: true,
      passwordHash: true,
      accounts: { select: { provider: true } },
    },
  });
  if (!user) return null;
  const { passwordHash, accounts, ...rest } = user;
  return {
    ...rest,
    hasPassword: Boolean(passwordHash),
    providers: accounts.map((account) => account.provider),
  };
}

export async function createUser(input: { name: string; email: string; passwordHash: string }): Promise<PublicUser> {
  const email = normalizeEmail(input.email);

  const existing = await prisma.user.findUnique({ where: { email }, select: { passwordHash: true } });
  if (existing) {
    throw new Error(existing.passwordHash ? "EMAIL_EXISTS" : "EMAIL_EXISTS_OAUTH");
  }

  try {
    const user = await prisma.user.create({
      data: { name: input.name.trim(), email, passwordHash: input.passwordHash },
      select: { id: true, name: true, email: true },
    });
    return user;
  } catch (error) {
    // Lost a race with a concurrent registration for the same email
    if (isUniqueViolation(error)) throw new Error("EMAIL_EXISTS");
    throw error;
  }
}

/**
 * Find or create the local user for a Google sign-in and link the Google account.
 * Google emails are only accepted when verified (checked in the signIn callback),
 * so matching an existing user by email is safe and avoids duplicate accounts.
 */
export async function upsertGoogleUser(input: {
  providerAccountId: string;
  email: string;
  name?: string | null;
  image?: string | null;
}): Promise<PublicUser> {
  const email = normalizeEmail(input.email);

  return prisma.$transaction(async (tx) => {
    const linked = await tx.account.findUnique({
      where: { provider_providerAccountId: { provider: "google", providerAccountId: input.providerAccountId } },
      select: { user: { select: { id: true, name: true, email: true, image: true } } },
    });
    if (linked) return { ...linked.user, image: linked.user.image ?? undefined };

    const user =
      (await tx.user.findUnique({ where: { email }, select: { id: true, name: true, email: true, image: true } })) ??
      (await tx.user.create({
        data: { name: input.name?.trim() || email.split("@")[0], email, image: input.image ?? null },
        select: { id: true, name: true, email: true, image: true },
      }));

    await tx.account.create({
      data: { userId: user.id, type: "oidc", provider: "google", providerAccountId: input.providerAccountId },
    });

    if (input.image && !user.image) {
      await tx.user.update({ where: { id: user.id }, data: { image: input.image } });
      user.image = input.image;
    }

    return { ...user, image: user.image ?? undefined };
  });
}
