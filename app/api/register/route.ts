import { NextResponse } from "next/server";
import bcrypt from "bcryptjs";

export async function POST(req: Request) {
  try {
    // Lazy load Prisma inside request handler for Cloudflare Workers compatibility
    const { prisma } = await import("@/app/lib/prisma");

    // Debug: log request details
    console.log("REGISTER REQUEST RECEIVED");
    console.log("Content-Type:", req.headers.get("content-type"));
    console.log("Content-Length:", req.headers.get("content-length"));
    
    // Read the body as text first to inspect it
    let bodyText = "";
    try {
      bodyText = await req.text();
      console.log("RAW BODY TEXT:", bodyText);
      console.log("BODY LENGTH:", bodyText.length);
      console.log("BODY FIRST 100 CHARS:", bodyText.substring(0, 100));
    } catch (e) {
      console.error("ERROR READING BODY:", e);
      throw e;
    }
    
    // Now parse it
    let body;
    try {
      body = JSON.parse(bodyText);
      console.log("PARSED BODY:", body);
    } catch (parseErr) {
      console.error("JSON PARSE ERROR:", parseErr);
      console.error("BODY WAS:", bodyText);
      throw parseErr;
    }

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
    console.error("Error details:", error);

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