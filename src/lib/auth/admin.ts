import { auth } from "@/auth";
import { isAdminEmail } from "@/lib/auth/roles";
import { prisma } from "@/lib/db";

/**
 * Returns the session when the current user is an admin, otherwise null.
 * Checked server-side on every admin request/action: the email must be in
 * ADMIN_EMAILS and still belong to an existing account. Client-side flags
 * (session.user.isAdmin) are only used to show/hide navigation.
 */
export async function getAdminSession() {
  const session = await auth();
  const { id, email } = session?.user ?? {};
  if (!id || !isAdminEmail(email)) return null;

  const user = await prisma.user.findUnique({ where: { id }, select: { email: true } });
  if (!user || !isAdminEmail(user.email)) return null;

  return session!;
}
