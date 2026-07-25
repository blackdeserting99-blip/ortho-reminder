import { NextResponse } from "next/server";
import bcrypt from "bcryptjs";

export async function POST(req: Request) {
  return NextResponse.json({
    available_env_vars: Object.keys(process.env).sort(),
    database_url_exists: !!process.env.DATABASE_URL,
    all_env_entries: Object.entries(process.env)
      .map(([k, v]) => `${k}=${v ? v.substring(0, 50) : 'undefined'}`)
      .slice(0, 20),
  });
}