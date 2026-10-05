import { beforeEach, describe, expect, it } from "vitest";
import { prisma } from "@/lib/db";
import { createUser, findUserForLogin, findUserProfile, upsertGoogleUser } from "@/lib/auth/users";
import { resetDatabase } from "../helpers";

beforeEach(resetDatabase);

describe("users", () => {
  it("registers a user with a normalised email and finds it case-insensitively", async () => {
    const user = await createUser({ name: " Kasun ", email: "Kasun@Example.TEST ", passwordHash: "hash" });
    expect(user).toEqual({ id: expect.any(String), name: "Kasun", email: "kasun@example.test" });
    expect((await findUserForLogin("KASUN@example.test"))?.id).toBe(user.id);
  });

  it("prevents duplicate accounts for the same email (any case)", async () => {
    await createUser({ name: "A", email: "dup@example.test", passwordHash: "hash" });
    await expect(createUser({ name: "B", email: "DUP@example.test", passwordHash: "hash" })).rejects.toThrow("EMAIL_EXISTS");
    expect(await prisma.user.count()).toBe(1);
  });

  it("enforces unique email at the database level", async () => {
    await prisma.user.create({ data: { name: "A", email: "unique@example.test" } });
    await expect(prisma.user.create({ data: { name: "B", email: "unique@example.test" } })).rejects.toMatchObject({
      code: "P2002",
    });
  });

  it("tells Google-only users to continue with Google when registering", async () => {
    await upsertGoogleUser({ providerAccountId: "g-1", email: "g@example.test", name: "G" });
    await expect(createUser({ name: "G", email: "g@example.test", passwordHash: "hash" })).rejects.toThrow(
      "EMAIL_EXISTS_OAUTH",
    );
  });

  it("never exposes the password hash from the profile lookup", async () => {
    const user = await createUser({ name: "P", email: "p@example.test", passwordHash: "secret-hash" });
    const profile = await findUserProfile(user.id);
    expect(profile).not.toHaveProperty("passwordHash");
    expect(profile?.hasPassword).toBe(true);
  });
});

describe("Google sign-in linking", () => {
  it("links Google to an existing email/password user instead of duplicating", async () => {
    const existing = await createUser({ name: "Nimal", email: "nimal@example.test", passwordHash: "hash" });
    const linked = await upsertGoogleUser({
      providerAccountId: "google-123",
      email: "Nimal@Example.test",
      name: "Nimal G",
      image: "https://lh3.googleusercontent.com/x",
    });

    expect(linked.id).toBe(existing.id);
    expect(await prisma.user.count()).toBe(1);
    const profile = await findUserProfile(existing.id);
    expect(profile?.providers).toEqual(["google"]);
    expect(profile?.hasPassword).toBe(true);
    expect(profile?.image).toBe("https://lh3.googleusercontent.com/x");
  });

  it("creates one user + account for a new Google user and reuses it on repeat sign-in", async () => {
    const first = await upsertGoogleUser({ providerAccountId: "google-999", email: "new@example.test", name: "New" });
    const again = await upsertGoogleUser({ providerAccountId: "google-999", email: "new@example.test", name: "New" });
    expect(again.id).toBe(first.id);
    expect(await prisma.user.count()).toBe(1);
    expect(await prisma.account.count()).toBe(1);
  });
});
