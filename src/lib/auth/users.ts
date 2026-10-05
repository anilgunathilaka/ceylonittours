import { promises as fs } from "fs";
import path from "path";

export type StoredUser = {
  id: string;
  name: string;
  email: string;
  /** Absent for accounts created via Google sign-in */
  passwordHash?: string;
  image?: string;
  createdAt: string;
};

const DATA_DIR = path.join(process.cwd(), "data");
const USERS_FILE = path.join(DATA_DIR, "users.json");

async function ensureStore() {
  await fs.mkdir(DATA_DIR, { recursive: true });
  try {
    await fs.access(USERS_FILE);
  } catch {
    await fs.writeFile(USERS_FILE, "[]", "utf8");
  }
}

async function readUsers(): Promise<StoredUser[]> {
  await ensureStore();
  const raw = await fs.readFile(USERS_FILE, "utf8");
  try {
    const parsed = JSON.parse(raw) as StoredUser[];
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

async function writeUsers(users: StoredUser[]) {
  await ensureStore();
  const data = JSON.stringify(users, null, 2);
  // Sync tools (e.g. OneDrive) can briefly lock the file on Windows, so retry transient errors
  for (let attempt = 1; ; attempt++) {
    try {
      await fs.writeFile(USERS_FILE, data, "utf8");
      return;
    } catch (error) {
      const code = (error as NodeJS.ErrnoException).code;
      if (attempt >= 5 || !["EBUSY", "EPERM", "EACCES"].includes(code ?? "")) throw error;
      await new Promise((resolve) => setTimeout(resolve, 100 * attempt));
    }
  }
}

export async function findUserByEmail(email: string) {
  const users = await readUsers();
  return users.find((user) => user.email.toLowerCase() === email.toLowerCase()) ?? null;
}

export async function createUser(input: {
  name: string;
  email: string;
  passwordHash: string;
}) {
  const users = await readUsers();
  const email = input.email.toLowerCase().trim();

  const existing = users.find((user) => user.email === email);
  if (existing) {
    throw new Error(existing.passwordHash ? "EMAIL_EXISTS" : "EMAIL_EXISTS_OAUTH");
  }

  const user: StoredUser = {
    id: crypto.randomUUID(),
    name: input.name.trim(),
    email,
    passwordHash: input.passwordHash,
    createdAt: new Date().toISOString(),
  };

  users.push(user);
  await writeUsers(users);

  return { id: user.id, name: user.name, email: user.email };
}

/** Find or create the local user record for a Google sign-in. */
export async function upsertOAuthUser(input: { name?: string | null; email: string; image?: string | null }) {
  const users = await readUsers();
  const email = input.email.toLowerCase().trim();
  let user = users.find((existing) => existing.email === email);

  if (!user) {
    user = {
      id: crypto.randomUUID(),
      name: input.name?.trim() || email.split("@")[0],
      email,
      image: input.image ?? undefined,
      createdAt: new Date().toISOString(),
    };
    users.push(user);
    await writeUsers(users);
  } else if (input.image && !user.image) {
    user.image = input.image;
    await writeUsers(users);
  }

  return { id: user.id, name: user.name, email: user.email, image: user.image };
}
