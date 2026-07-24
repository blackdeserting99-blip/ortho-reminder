import { NextResponse } from "next/server";
import { prisma } from "@/app/lib/prisma";
import bcrypt from "bcryptjs";

export async function POST(request: Request) {
  try {
    console.log("=== REGISTER START ===");

    const body = await request.json();
    console.log("Request received");

    const { name, email, password } = body;

    if (!name || !email || !password) {
      return NextResponse.json(
        {
          error: "Missing required fields.",
        },
        { status: 400 }
      );
    }

    console.log("Checking existing user...");

    const existingUser = await prisma.user.findUnique({
      where: { email },
    });

    if (existingUser) {
      console.log("User already exists");

      return NextResponse.json(
        {
          error: "Email already exists.",
        },
        { status: 409 }
      );
    }

    console.log("Hashing password...");

    const passwordHash = await bcrypt.hash(password, 12);

    console.log("Creating user...");

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

    console.log("User created successfully");

    return NextResponse.json(
      {
        success: true,
        user,
      },
      { status: 201 }
    );
  } catch (error) {
    console.error("========== REGISTER ERROR ==========");
    console.error(error);
    console.error("====================================");

    return NextResponse.json(
      {
        success: false,
        error: "Registration failed",
        details: {
          name: error instanceof Error ? error.name : "Unknown",
          message: error instanceof Error ? error.message : String(error),
          stack: error instanceof Error ? error.stack : null,
        },
      },
      { status: 500 }
    );
  }
}