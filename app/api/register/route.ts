import { NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { prisma } from "@/app/lib/prisma";

export async function POST(req: Request) {
  console.log("🔥 REGISTER VERSION TEST 123");

  try {
    const body = await req.json();

    console.log("REGISTER BODY RECEIVED:", {
      name: body.name,
      email: body.email,
    });

    const { name, email, password } = body;

    if (!name || !email || !password) {
      return NextResponse.json(
        { error: "Missing fields" },
        { status: 400 }
      );
    }

    console.log("CHECKING EXISTING USER");

    const existingUser = await prisma.user.findUnique({
      where: { email },
    });

    if (existingUser) {
      return NextResponse.json(
        { error: "Email already exists" },
        { status: 400 }
      );
    }

    console.log("HASHING PASSWORD");

    const passwordHash = await bcrypt.hash(password, 10);

    console.log("PASSWORD HASH DONE");

    console.log("CREATING USER");

    const user = await prisma.user.create({
      data: {
        name,
        email,
        passwordHash,
      },
    });

    console.log("USER CREATED:", user.id);

    return NextResponse.json({
      ok: true,
      user: {
        id: user.id,
        email: user.email,
      },
    });

  } catch (error) {
    console.error("===== REGISTER FAILED =====");
    console.error(error);

    return NextResponse.json(
      {
        ok: false,
        error: "Register failed",
        debug: error instanceof Error ? error.message : String(error),
      },
      { status: 500 }
    );
  }
}git add app/api/register/route.ts