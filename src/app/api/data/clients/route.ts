import { NextResponse } from "next/server";
import { queryAll } from "@/lib/db/client";

export async function GET() {
  const data = queryAll("SELECT id, name FROM clients WHERE is_active = 1 ORDER BY name");
  return NextResponse.json(data);
}
