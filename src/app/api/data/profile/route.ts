import { NextRequest, NextResponse } from "next/server";
import { queryOne, execute } from "@/lib/db/client";

export async function GET() {
  const data = queryOne("SELECT * FROM profiles WHERE id = 'default'");
  return NextResponse.json(data || {});
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();

    // Validate inputs
    const companyName = String(body.company_name || "").trim();
    if (!companyName || companyName.length > 100) {
      return NextResponse.json({ error: "회사명은 1~100자로 입력하세요." }, { status: 400 });
    }

    const businessNumber = String(body.business_number || "").trim();
    if (businessNumber && !/^\d{3}-\d{2}-\d{5}$/.test(businessNumber)) {
      return NextResponse.json({ error: "사업자번호 형식: 000-00-00000" }, { status: 400 });
    }

    const representativeName = String(body.representative_name || "").trim();
    if (representativeName.length > 50) {
      return NextResponse.json({ error: "대표자명은 50자 이내로 입력하세요." }, { status: 400 });
    }

    execute(
      "UPDATE profiles SET company_name = ?, business_number = ?, representative_name = ?, updated_at = CURRENT_TIMESTAMP WHERE id = 'default'",
      companyName, businessNumber || null, representativeName || null
    );
    return NextResponse.json({ success: true });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
