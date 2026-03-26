import { NextRequest, NextResponse } from "next/server";
import { queryAll, queryOne, execute, uuid } from "@/lib/db/client";

export async function GET() {
  const closings = queryAll(
    "SELECT * FROM fiscal_closings ORDER BY fiscal_year DESC"
  );
  return NextResponse.json(closings);
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { fiscal_year } = body;

    if (!fiscal_year) {
      return NextResponse.json({ error: "회계연도를 입력하세요." }, { status: 400 });
    }

    // Check if already closed
    const existing = queryOne<any>(
      "SELECT id FROM fiscal_closings WHERE fiscal_year = ? AND status = 'closed'",
      fiscal_year
    );

    if (existing) {
      return NextResponse.json(
        { error: `${fiscal_year}년은 이미 결산 마감되었습니다.` },
        { status: 400 }
      );
    }

    const today = new Date().toISOString().split("T")[0];
    const now = new Date().toISOString();
    const id = uuid();

    execute(
      `INSERT INTO fiscal_closings (id, fiscal_year, closing_date, status, closed_at)
       VALUES (?, ?, ?, 'closed', ?)`,
      id,
      fiscal_year,
      today,
      now
    );

    return NextResponse.json({ id, success: true });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
