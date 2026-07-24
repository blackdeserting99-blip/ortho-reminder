import { NextResponse } from "next/server";
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

export async function GET() {
  try {
    const user = await prisma.user.findFirst();
    
    return NextResponse.json({
      id: user?.id || "dev-user",
      name: user?.name || "Developer",
      email: user?.email || "dev@example.com",
    });
  } catch (error) {
    return NextResponse.json({
      id: "dev-user",
      name: "Developer",
      email: "dev@example.com",
    });
  }
}