import { NextRequest, NextResponse } from "next/server";
import { parseExcelBuffer, autoDetectColumns } from "@/lib/excel/parser";

export async function POST(request: NextRequest) {
  try {
    const buffer = await request.arrayBuffer();
    const sheets = await parseExcelBuffer(buffer);

    if (sheets.length === 0) {
      return NextResponse.json({ error: "엑셀 파일에 데이터가 없습니다." });
    }

    const autoMapping = autoDetectColumns(sheets[0].headers);

    return NextResponse.json({ sheets, autoMapping });
  } catch (err: any) {
    return NextResponse.json({ error: `엑셀 파싱 오류: ${err.message}` });
  }
}
