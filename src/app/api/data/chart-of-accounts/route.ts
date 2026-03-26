import { NextResponse } from "next/server";
import { queryAll } from "@/lib/db/client";

export async function GET() {
  const data = queryAll("SELECT code, name, category FROM chart_of_accounts WHERE is_active = 1 ORDER BY code");
  return NextResponse.json(data);
}
