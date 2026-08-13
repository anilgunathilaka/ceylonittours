import { NextResponse } from "next/server";
import { hash } from "bcryptjs";
import { registerSchema } from "@/lib/validation/schemas";
import { createUser } from "@/lib/auth/users";

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const parsed = registerSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { error: "Invalid registration details", issues: parsed.error.flatten() },
        { status: 400 },
      );
    }

    const passwordHash = await hash(parsed.data.password, 12);
    const user = await createUser({
      name: parsed.data.name,
      email: parsed.data.email,
      passwordHash,
    });

    return NextResponse.json({ user }, { status: 201 });
  } catch (error) {
    if (error instanceof Error && error.message === "EMAIL_EXISTS") {
      return NextResponse.json({ error: "An account with this email already exists." }, { status: 409 });
    }

    console.error("Registration failed:", error);
    return NextResponse.json({ error: "Unable to create account." }, { status: 500 });
  }
}
