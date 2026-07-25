import { NextResponse } from "next/server";
import bcrypt from "bcryptjs";

export async function POST(req: Request) {
  try {
    console.log("REGISTER: Step 1 - Handler called");
    
    // Lazy load Prisma inside request handler for Cloudflare Workers compatibility
    const { prisma } = await import("@/app/lib/prisma");
    console.log("REGISTER: Step 2 - Prisma imported");

    const body = await req.json();
    console.log("REGISTER: Step 3 - Body parsed:", body);

    const { name, email, password } = body;

    if (!name || !email || !password) {
      return NextResponse.json(
        { error: "Missing fields" },
        { status: 400 }
      );
    }

    console.log("CHECKING EXISTING USER...");

    const existingUser = await prisma.user.findUnique({
      where: {
        email,
      },
    });

    if (existingUser) {
      console.log("USER ALREADY EXISTS");

      return NextResponse.json(
        { error: "Email already exists" },
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
    console.error("===== REGISTER FAILED =====");
    console.error("Error type:", typeof error);
    console.error("Error instanceof Error:", error instanceof Error);
    if (error instanceof Error) {
      console.error("Error name:", error.name);
      console.error("Error message:", error.message);
      console.error("Error stack:", error.stack);
    } else {
      console.error("Error as JSON:", JSON.stringify(error, null, 2));
    }

    // Better error serialization for Cloudflare Workers
    let errorMessage = "Unknown error";
    if (error instanceof Error) {
      errorMessage = error.message;
    } else if (typeof error === "string") {
      errorMessage = error;
    } else if (error && typeof error === "object") {
      errorMessage = (error as any).message || JSON.stringify(error);
    }

    return NextResponse.json(
      {
        ok: false,
        error: "Register failed",
        debug: errorMessage,
      },
      { status: 500 }
    );
  }
}