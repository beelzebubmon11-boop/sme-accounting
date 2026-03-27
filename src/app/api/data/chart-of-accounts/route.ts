import { NextResponse } from "next/server";
import { queryAll } from "@/lib/db/client";

export async function GET() {
  const data = await queryAll("SELECT code, name, category, sub_category FROM chart_of_accounts WHERE is_active = 1 ORDER BY code");
  return NextResponse.json(data);
}
