import { NextRequest, NextResponse } from "next/server";
import { queryAll, queryOne, execute, uuid } from "@/lib/db/client";

export async function GET() {
  const assets = queryAll(
    `SELECT * FROM fixed_assets ORDER BY acquisition_date DESC`
  );
  return NextResponse.json(assets);
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { name, account_code, acquisition_date, acquisition_cost, useful_life, depreciation_method, salvage_value } = body;

    if (!name || !account_code || !acquisition_cost) {
      return NextResponse.json({ error: "필수 항목이 누락되었습니다." }, { status: 400 });
    }

    const account = queryOne<any>(
      "SELECT code, name FROM chart_of_accounts WHERE code = ?",
      account_code
    );

    if (!account) {
      return NextResponse.json({ error: "유효하지 않은 계정과목입니다." }, { status: 400 });
    }

    const id = uuid();
    const bookValue = acquisition_cost - (salvage_value || 0) > 0 ? acquisition_cost : acquisition_cost;

    execute(
      `INSERT INTO fixed_assets (id, name, account_code, account_name, acquisition_date, acquisition_cost, useful_life, depreciation_method, salvage_value, accumulated_depreciation, book_value, status)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 0, ?, 'active')`,
      id,
      name,
      account_code,
      account.name,
      acquisition_date,
      acquisition_cost,
      useful_life || 5,
      depreciation_method || "straight",
      salvage_value || 0,
      acquisition_cost
    );

    return NextResponse.json({ id, success: true });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
