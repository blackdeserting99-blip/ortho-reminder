import { NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { prisma } from "@/app/lib/prisma";

export async function POST(req: Request) {
  try {
    const body = await req.json();

    console.log("REGISTER BODY RECEIVED:", {
      name: body.name,
      email: body.email,
    });

    const { name, email, password } = body;

    if (!name || !email || !password) {
      return NextResponse.json(
        {
          error: "Missing fields",
        },
        { status: 400 }
      );
    }

    console.log("CHECKING EXISTING USER...");

    const existingUser = await prisma.user.findUnique({
      where: {
        email,
      },
    });

    console.log("EXISTING USER RESULT:", !!existingUser);

    if (existingUser) {
      return NextResponse.json(
        {
          error: "Email already exists",
        },
        { status: 400 }
      );
    }

    console.log("HASHING PASSWORD...");

    const passwordHash = await bcrypt.hash(password, 10);

    console.log("CREATING USER...");

    const user = await prisma.user.create({
      data: {
        name,
        email,
        passwordHash,
      },
    });

    console.log("REGISTER SUCCESS:", user.id);

    return NextResponse.json({
      ok: true,
      user: {
        id: user.id,
        email: user.email,
      },
    });
  } catch (error) {
    console.error("===== REGISTER ERROR =====");
    console.error("TYPE:", typeof error);
    console.error("NAME:", error instanceof Error ? error.name : "unknown");
    console.error(
      "MESSAGE:",
      error instanceof Error ? error.message : String(error)
    );
    console.error(
      "STACK:",
      error instanceof Error ? error.stack : "no stack"
    );
    console.error("FULL ERROR:", error);
    console.error("==========================");

    return NextResponse.json(
      {
        ok: false,
        error:
          error instanceof Error
            ? {
                name: error.name,
                message: error.message,
              }
            : String(error),
      },
      { status: 500 }
    );
  }
}