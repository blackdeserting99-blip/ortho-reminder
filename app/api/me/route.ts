import { NextResponse } from "next/server";
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

export async function POST(request: Request) {
  try {
    const { fullname, email, password } = await request.json();
    
    // Create user
    const user = await prisma.user.create({
      data: {
        fullname: fullname,
        email: email,
        password: password, // You should hash this later!
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