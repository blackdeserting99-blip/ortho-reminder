import { NextResponse } from "next/server";
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

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