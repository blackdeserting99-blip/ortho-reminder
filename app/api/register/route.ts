import { NextResponse } from "next/server";
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

export async function POST(request: Request) {
  // DEBUG: Check if DATABASE_URL exists
  console.log("=== DEBUG ===");
  console.log("DATABASE_URL exists:", !!process.env.DATABASE_URL);
  console.log("DATABASE_URL starts with:", process.env.DATABASE_URL?.substring(0, 30));
  console.log("==============");
  
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
      error: "Registration failed",
      details: String(error)
    }, { status: 500 });
  }
}