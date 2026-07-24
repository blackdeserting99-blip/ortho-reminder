import { NextResponse } from "next/server";

export async function GET() {
  return NextResponse.json({ 
    patches: [] 
  });
}

export async function POST() {
  return NextResponse.json({ 
    success: true 
  });
}