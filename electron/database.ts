import Database from "better-sqlite3";
import path from "path";
import fs from "fs";
import { randomUUID } from "crypto";

let db: Database.Database;

export function getDb(): Database.Database {
  if (db) return db;
  throw new Error("Database not initialized. Call initDatabase() first.");
}

export function initDatabase(userDataPath: string): Database.Database {
  const dbDir = path.join(userDataPath, "sme-accounting");
  if (!fs.existsSync(dbDir)) {
    fs.mkdirSync(dbDir, { recursive: true });
  }

  const dbPath = path.join(dbDir, "data.db");
  db = new Database(dbPath);

  // Enable WAL mode for better performance
  db.pragma("journal_mode = WAL");
  db.pragma("foreign_keys = ON");

  runMigrations();
  seedDefaultData();

  return db;
}

function runMigrations() {
  // Create migrations tracking table
  db.exec(`
    CREATE TABLE IF NOT EXISTS _migrations (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL UNIQUE,
      applied_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )
  `);

  const migrationsDir = path.join(__dirname, "migrations");
  if (!fs.existsSync(migrationsDir)) return;

  const files = fs.readdirSync(migrationsDir)
    .filter((f) => f.endsWith(".sql"))
    .sort();

  const applied = new Set(
    db
      .prepare("SELECT name FROM _migrations")
      .all()
      .map((r: any) => r.name)
  );

  for (const file of files) {
    if (applied.has(file)) continue;
    const sql = fs.readFileSync(path.join(migrationsDir, file), "utf-8");
    db.exec(sql);
    db.prepare("INSERT INTO _migrations (name) VALUES (?)").run(file);
    console.log(`Migration applied: ${file}`);
  }
}

function seedDefaultData() {
  // Check if chart_of_accounts has data
  const count = db.prepare("SELECT COUNT(*) as cnt FROM chart_of_accounts").get() as { cnt: number };
  if (count.cnt > 0) return;

  const insertCoa = db.prepare(
    "INSERT INTO chart_of_accounts (id, code, name, category, sub_category) VALUES (?, ?, ?, ?, ?)"
  );

  const chartOfAccounts = [
    { code: "101", name: "현금", category: "asset", sub: "유동자산" },
    { code: "103", name: "보통예금", category: "asset", sub: "유동자산" },
    { code: "104", name: "정기예금", category: "asset", sub: "유동자산" },
    { code: "108", name: "외상매출금", category: "asset", sub: "유동자산" },
    { code: "109", name: "받을어음", category: "asset", sub: "유동자산" },
    { code: "110", name: "미수금", category: "asset", sub: "유동자산" },
    { code: "120", name: "선급금", category: "asset", sub: "유동자산" },
    { code: "121", name: "선급비용", category: "asset", sub: "유동자산" },
    { code: "124", name: "부가세대급금", category: "asset", sub: "유동자산" },
    { code: "201", name: "건물", category: "asset", sub: "비유동자산" },
    { code: "202", name: "차량운반구", category: "asset", sub: "비유동자산" },
    { code: "203", name: "비품", category: "asset", sub: "비유동자산" },
    { code: "251", name: "외상매입금", category: "liability", sub: "유동부채" },
    { code: "252", name: "지급어음", category: "liability", sub: "유동부채" },
    { code: "253", name: "미지급금", category: "liability", sub: "유동부채" },
    { code: "254", name: "미지급비용", category: "liability", sub: "유동부채" },
    { code: "255", name: "선수금", category: "liability", sub: "유동부채" },
    { code: "256", name: "예수금", category: "liability", sub: "유동부채" },
    { code: "257", name: "부가세예수금", category: "liability", sub: "유동부채" },
    { code: "280", name: "장기차입금", category: "liability", sub: "비유동부채" },
    { code: "331", name: "자본금", category: "equity", sub: "자본금" },
    { code: "341", name: "이익잉여금", category: "equity", sub: "이익잉여금" },
    { code: "401", name: "상품매출", category: "revenue", sub: "매출" },
    { code: "404", name: "용역매출", category: "revenue", sub: "매출" },
    { code: "901", name: "이자수익", category: "revenue", sub: "영업외수익" },
    { code: "902", name: "잡이익", category: "revenue", sub: "영업외수익" },
    { code: "501", name: "상품매입", category: "expense", sub: "매출원가" },
    { code: "801", name: "급여", category: "expense", sub: "판매비와관리비" },
    { code: "803", name: "퇴직급여", category: "expense", sub: "판매비와관리비" },
    { code: "805", name: "복리후생비", category: "expense", sub: "판매비와관리비" },
    { code: "807", name: "보험료", category: "expense", sub: "판매비와관리비" },
    { code: "811", name: "여비교통비", category: "expense", sub: "판매비와관리비" },
    { code: "812", name: "통신비", category: "expense", sub: "판매비와관리비" },
    { code: "814", name: "수도광열비", category: "expense", sub: "판매비와관리비" },
    { code: "818", name: "접대비", category: "expense", sub: "판매비와관리비" },
    { code: "820", name: "감가상각비", category: "expense", sub: "판매비와관리비" },
    { code: "826", name: "임차료", category: "expense", sub: "판매비와관리비" },
    { code: "829", name: "수선비", category: "expense", sub: "판매비와관리비" },
    { code: "830", name: "세금과공과", category: "expense", sub: "판매비와관리비" },
    { code: "831", name: "소모품비", category: "expense", sub: "판매비와관리비" },
    { code: "832", name: "지급수수료", category: "expense", sub: "판매비와관리비" },
    { code: "840", name: "광고선전비", category: "expense", sub: "판매비와관리비" },
    { code: "845", name: "운반비", category: "expense", sub: "판매비와관리비" },
    { code: "951", name: "이자비용", category: "expense", sub: "영업외비용" },
  ];

  const insertCategory = db.prepare(
    "INSERT INTO categories (id, name, type, account_code, account_name, is_default) VALUES (?, ?, ?, ?, ?, 1)"
  );

  const defaultCategories = [
    { name: "매출입금", type: "income", code: "401", acctName: "상품매출" },
    { name: "용역매출", type: "income", code: "404", acctName: "용역매출" },
    { name: "이자수익", type: "income", code: "901", acctName: "이자수익" },
    { name: "상품매입", type: "expense", code: "501", acctName: "상품매입" },
    { name: "급여", type: "expense", code: "801", acctName: "급여" },
    { name: "복리후생비", type: "expense", code: "805", acctName: "복리후생비" },
    { name: "여비교통비", type: "expense", code: "811", acctName: "여비교통비" },
    { name: "통신비", type: "expense", code: "812", acctName: "통신비" },
    { name: "접대비", type: "expense", code: "818", acctName: "접대비" },
    { name: "임차료", type: "expense", code: "826", acctName: "임차료" },
    { name: "소모품비", type: "expense", code: "831", acctName: "소모품비" },
    { name: "세금과공과", type: "expense", code: "830", acctName: "세금과공과" },
    { name: "계좌이체", type: "transfer", code: "103", acctName: "보통예금" },
  ];

  const seed = db.transaction(() => {
    for (const item of chartOfAccounts) {
      insertCoa.run(randomUUID(), item.code, item.name, item.category, item.sub);
    }
    for (const item of defaultCategories) {
      insertCategory.run(randomUUID(), item.name, item.type, item.code, item.acctName);
    }
  });
  seed();
  console.log("Seed data applied.");
}

// ============ QUERY HELPERS ============

export function uuid(): string {
  return randomUUID();
}

// Generic query helpers
export function queryAll<T = any>(sql: string, params?: any[]): T[] {
  return db.prepare(sql).all(...(params || [])) as T[];
}

export function queryOne<T = any>(sql: string, params?: any[]): T | undefined {
  return db.prepare(sql).get(...(params || [])) as T | undefined;
}

export function execute(sql: string, params?: any[]) {
  return db.prepare(sql).run(...(params || []));
}

export function runTransaction<T>(fn: () => T): T {
  return db.transaction(fn)();
}

// ============ JOURNAL ENTRY HELPERS ============

export function createJournalEntry(data: {
  transactionId?: string;
  saleId?: string;
  purchaseId?: string;
  entryDate: string;
  description: string;
  lines: {
    accountCode: string;
    accountName: string;
    debitAmount: number;
    creditAmount: number;
    clientId?: string;
    description?: string;
  }[];
}) {
  const entryId = uuid();
  execute(
    `INSERT INTO journal_entries (id, transaction_id, sale_id, purchase_id, entry_date, description)
     VALUES (?, ?, ?, ?, ?, ?)`,
    [entryId, data.transactionId || null, data.saleId || null, data.purchaseId || null, data.entryDate, data.description]
  );

  const insertLine = db.prepare(
    `INSERT INTO journal_entry_lines (id, journal_entry_id, account_code, account_name, debit_amount, credit_amount, client_id, description, line_order)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`
  );

  data.lines.forEach((line, idx) => {
    insertLine.run(
      uuid(),
      entryId,
      line.accountCode,
      line.accountName,
      line.debitAmount,
      line.creditAmount,
      line.clientId || null,
      line.description || null,
      idx
    );
  });

  return entryId;
}
