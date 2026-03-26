import { NextResponse } from "next/server";
import { queryAll } from "@/lib/db/client";

export async function GET() {
  const data = queryAll("SELECT id, name, type, account_code, account_name FROM categories ORDER BY name");
  return NextResponse.json(data);
}
