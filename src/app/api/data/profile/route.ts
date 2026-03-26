import { NextRequest, NextResponse } from "next/server";
import { queryOne, execute } from "@/lib/db/client";

export async function GET() {
  const data = queryOne("SELECT * FROM profiles WHERE id = 'default'");
  return NextResponse.json(data || {});
}

export async function POST(request: NextRequest) {
  const body = await request.json();
  execute(
    "UPDATE profiles SET company_name = ?, business_number = ?, representative_name = ?, updated_at = CURRENT_TIMESTAMP WHERE id = 'default'",
    body.company_name, body.business_number || null, body.representative_name || null
  );
  return NextResponse.json({ success: true });
}
