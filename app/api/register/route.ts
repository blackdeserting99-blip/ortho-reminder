import { NextResponse } from "next/server";
import { PrismaClient } from "@prisma/client";

// Don't create new instance here
let prisma: PrismaClient;

if (process.env.NODE_ENV === "production") {
  prisma = new PrismaClient();
} else {
  // In development, reuse existing instance
  const globalWithPrisma = global as typeof globalThis & {
    prisma?: PrismaClient;
  };
  if (!globalWithPrisma.prisma) {
    globalWithPrisma.prisma = new PrismaClient();
  }
  prisma = globalWithPrisma.prisma;
}

export async function POST(request: Request) {
  try {
    const { name, email, password } = await request.json();
    
    const user = await prisma.user.create({
      data: {
        name: name,
        email: email,
        passwordHash: password,
      },
    });
    
    return NextResponse.json({ 
      success: true, 
      user: user 
    });
    
  } catch (error) {
    console.error("Registration error:", error);
    return NextResponse.json({ 
      error: "Registration failed" 
    }, { status: 500 });
  }
}