import ExcelJS from "exceljs";

export type ParsedRow = {
  date: string;
  deposit: number;
  withdrawal: number;
  balance: number;
  description: string;
};

export type ColumnMapping = {
  date: number;
  deposit: number;
  withdrawal: number;
  balance: number;
  description: number;
};

export type SheetData = {
  sheetName: string;
  headers: string[];
  rows: any[][];
};

export async function parseExcelBuffer(buffer: ArrayBuffer): Promise<SheetData[]> {
  const workbook = new ExcelJS.Workbook();
  await workbook.xlsx.load(buffer);

  const sheets: SheetData[] = [];

  workbook.eachSheet((sheet) => {
    const headers: string[] = [];
    const rows: any[][] = [];

    sheet.eachRow((row, rowNumber) => {
      const values = row.values as any[];
      // ExcelJS row.values[0] is always undefined (1-indexed)
      const cells = values.slice(1).map((v) => {
        if (v === null || v === undefined) return "";
        if (v instanceof Date) return v.toISOString().split("T")[0];
        if (typeof v === "object" && v.result !== undefined) return v.result;
        if (typeof v === "object" && v.text) return v.text;
        return String(v);
      });

      if (rowNumber === 1) {
        headers.push(...cells);
      } else {
        rows.push(cells);
      }
    });

    if (headers.length > 0) {
      sheets.push({ sheetName: sheet.name, headers, rows });
    }
  });

  return sheets;
}

export function autoDetectColumns(headers: string[]): Partial<ColumnMapping> {
  const mapping: Partial<ColumnMapping> = {};

  headers.forEach((h, i) => {
    const lower = h.toLowerCase().trim();
    if (!mapping.date && (lower.includes("날짜") || lower.includes("일자") || lower.includes("date") || lower.includes("거래일"))) {
      mapping.date = i;
    }
    if (!mapping.deposit && (lower.includes("입금") || lower.includes("수입") || lower.includes("deposit") || lower === "입금액")) {
      mapping.deposit = i;
    }
    if (!mapping.withdrawal && (lower.includes("출금") || lower.includes("지출") || lower.includes("withdrawal") || lower === "출금액")) {
      mapping.withdrawal = i;
    }
    if (!mapping.balance && (lower.includes("잔액") || lower.includes("잔고") || lower.includes("balance"))) {
      mapping.balance = i;
    }
    if (!mapping.description && (lower.includes("적요") || lower.includes("내용") || lower.includes("메모") || lower.includes("비고") || lower.includes("description"))) {
      mapping.description = i;
    }
  });

  return mapping;
}

export function applyMapping(rows: any[][], mapping: ColumnMapping): ParsedRow[] {
  return rows
    .map((row) => {
      const dateRaw = row[mapping.date] || "";
      const depositRaw = row[mapping.deposit] || "0";
      const withdrawalRaw = row[mapping.withdrawal] || "0";
      const balanceRaw = row[mapping.balance] || "0";
      const descRaw = row[mapping.description] || "";

      // Parse date
      let date = "";
      if (dateRaw) {
        const d = String(dateRaw).replace(/\./g, "-").replace(/\//g, "-").trim();
        // Handle YYYYMMDD
        if (/^\d{8}$/.test(d)) {
          date = `${d.slice(0, 4)}-${d.slice(4, 6)}-${d.slice(6, 8)}`;
        } else if (/^\d{4}-\d{2}-\d{2}/.test(d)) {
          date = d.slice(0, 10);
        } else {
          date = d;
        }
      }

      const parseAmount = (v: any): number => {
        const s = String(v).replace(/[,\s원₩]/g, "");
        return Math.abs(Number(s)) || 0;
      };

      return {
        date,
        deposit: parseAmount(depositRaw),
        withdrawal: parseAmount(withdrawalRaw),
        balance: parseAmount(balanceRaw),
        description: String(descRaw).trim(),
      };
    })
    .filter((r) => r.date && (r.deposit > 0 || r.withdrawal > 0));
}
