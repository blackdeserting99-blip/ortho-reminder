import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/app/lib/prisma";
import { createSessionCookie, hashPassword } from "@/app/lib/auth";

const registerSchema = z.object({
  name: z.string().min(1, "Name is required"),
  email: z.string().email("Invalid email address"),
  password: z.string().min(8, "Password must be at least 8 characters"),
});

export async function POST(request: Request) {
  try {
    const body = await request.json().catch(() => null);

    if (!body) {
      return NextResponse.json(
        { error: "Request body must be valid JSON." },
        { status: 400 }
      );
    }

    const parseResult = registerSchema.safeParse(body);

    if (!parseResult.success) {
      const errors = parseResult.error.format();
      return NextResponse.json({ error: "Validation failed.", details: errors }, { status: 400 });
    }

    const { name, email, password } = parseResult.data;

console.log("🔵 About to query user...");

let existingUser;

try {
  existingUser = await prisma.user.findUnique({
    where: { email },
  });

  console.log("🟢 Query finished:", existingUser);
} catch (err) {
  console.error("🔴 Prisma findUnique failed");
  console.error(err);
  throw err;
}

if (existingUser) {
  return NextResponse.json(
    { error: "A user with this email already exists." },
    { status: 409 }
  );
}

    const passwordHash = await hashPassword(password);

    const user = await prisma.user.create({
      data: {
        name,
        email,
        passwordHash,
      },
      select: {
        id: true,
        name: true,
        email: true,
        createdAt: true,
      },
    });

    await createSessionCookie(user.id);

    return NextResponse.json({ success: true, user }, { status: 201 });
  } catch (error) {
    console.error("[REGISTER API ERROR]", error);
    console.error("Stack trace:", error instanceof Error ? error.stack : "No stack trace");
    return NextResponse.json(
      { error: "Registration failed. Please try again.", details: error instanceof Error ? error.message : String(error) },
      { status: 500 }
    );
  }
}
