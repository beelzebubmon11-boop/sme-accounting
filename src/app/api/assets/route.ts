import { NextRequest, NextResponse } from "next/server";
import { queryAll, queryOne, execute, uuid } from "@/lib/db/client";

export async function GET() {
  const assets = await queryAll(
    `SELECT * FROM fixed_assets WHERE status = 'active' OR status = 'disposed' ORDER BY acquisition_date DESC`
  );
  return NextResponse.json(assets);
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { name, account_code, acquisition_date, acquisition_cost, useful_life, depreciation_method, salvage_value } = body;

    // Validate required fields
    if (!name || typeof name !== "string" || name.trim().length === 0) {
      return NextResponse.json({ error: "자산명을 입력하세요." }, { status: 400 });
    }
    if (!account_code) {
      return NextResponse.json({ error: "계정과목을 선택하세요." }, { status: 400 });
    }
    if (!acquisition_date || !/^\d{4}-\d{2}-\d{2}$/.test(acquisition_date)) {
      return NextResponse.json({ error: "취득일을 입력하세요. (YYYY-MM-DD)" }, { status: 400 });
    }

    const cost = Math.round(Number(acquisition_cost) || 0);
    if (cost <= 0) {
      return NextResponse.json({ error: "취득원가는 0보다 커야 합니다." }, { status: 400 });
    }

    const life = Math.round(Number(useful_life) || 5);
    if (life <= 0 || life > 50) {
      return NextResponse.json({ error: "내용연수는 1~50년 이내로 입력하세요." }, { status: 400 });
    }

    const sv = Math.round(Number(salvage_value) || 0);
    if (sv < 0 || sv >= cost) {
      return NextResponse.json({ error: "잔존가치는 0 이상, 취득원가 미만이어야 합니다." }, { status: 400 });
    }

    const method = depreciation_method === "declining" ? "declining" : "straight";

    const account = await queryOne<any>(
      "SELECT code, name FROM chart_of_accounts WHERE code = ?",
      account_code
    );
    if (!account) {
      return NextResponse.json({ error: "유효하지 않은 계정과목입니다." }, { status: 400 });
    }

    const id = uuid();

    await execute(
      `INSERT INTO fixed_assets (id, name, account_code, account_name, acquisition_date, acquisition_cost, useful_life, depreciation_method, salvage_value, accumulated_depreciation, book_value, status)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 0, ?, 'active')`,
      id, name.trim(), account_code, account.name,
      acquisition_date, cost, life, method, sv, cost
    );

    return NextResponse.json({ id, success: true });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
