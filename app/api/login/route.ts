import { NextResponse } from "next/server";

export async function POST(request: Request) {
  try {
    const { email, password } = await request.json();
    
    // Simple login - just return success for now
    return NextResponse.json({ 
      success: true,
      user: { email, name: "User" }
    });
    
  } catch (error) {
    return NextResponse.json({ 
      error: "Login failed" 
    }, { status: 500 });
  }
}