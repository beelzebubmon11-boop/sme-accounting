import { NextResponse } from "next/server";
import path from "path";
import fs from "fs";

export async function GET() {
  try {
    const dbPath = process.env.SME_DB_PATH || path.join(process.cwd(), "dev-data.db");

    if (!fs.existsSync(dbPath)) {
      return NextResponse.json({ error: "데이터베이스 파일을 찾을 수 없습니다." }, { status: 404 });
    }

    const fileBuffer = fs.readFileSync(dbPath);
    const now = new Date();
    const dateStr = `${now.getFullYear()}${String(now.getMonth() + 1).padStart(2, "0")}${String(now.getDate()).padStart(2, "0")}`;

    return new NextResponse(fileBuffer, {
      headers: {
        "Content-Type": "application/x-sqlite3",
        "Content-Disposition": `attachment; filename="sme-accounting-backup-${dateStr}.db"`,
        "Content-Length": String(fileBuffer.length),
      },
    });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
