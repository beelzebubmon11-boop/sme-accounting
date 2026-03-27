import Database from "better-sqlite3";
import path from "path";
import fs from "fs";
import { randomUUID } from "crypto";

let _db: Database.Database | null = null;

function getDbPath(): string {
  return process.env.SME_DB_PATH || path.join(process.cwd(), "dev-data.db");
}

export function getDb(): Database.Database {
  if (_db) return _db;
  const dbPath = getDbPath();

  // Ensure directory exists
  const dir = path.dirname(dbPath);
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });

  _db = new Database(dbPath);
  _db.pragma("journal_mode = WAL");
  _db.pragma("foreign_keys = ON");

  // Run migrations if needed
  initMigrations();

  return _db;
}

function initMigrations() {
  if (!_db) return;

  _db.exec(`CREATE TABLE IF NOT EXISTS _migrations (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL UNIQUE,
    applied_at DATETIME DEFAULT CURRENT_TIMESTAMP
  )`);

  const migrationsDir = path.join(process.cwd(), "electron", "migrations");
  if (!fs.existsSync(migrationsDir)) return;

  const files = fs.readdirSync(migrationsDir).filter(f => f.endsWith(".sql")).sort();
  const applied = new Set(
    (_db.prepare("SELECT name FROM _migrations").all() as any[]).map(r => r.name)
  );

  for (const file of files) {
    if (applied.has(file)) continue;
    const sql = fs.readFileSync(path.join(migrationsDir, file), "utf-8");
    _db.exec(sql);
    _db.prepare("INSERT INTO _migrations (name) VALUES (?)").run(file);
  }

  // Seed data
  seedIfEmpty();
}

function seedIfEmpty() {
  if (!_db) return;
  const count = (_db.prepare("SELECT COUNT(*) as cnt FROM chart_of_accounts").get() as any)?.cnt || 0;
  if (count > 0) return;

  const coa = [
    ["101","현금","asset","유동자산"],["103","보통예금","asset","유동자산"],["104","정기예금","asset","유동자산"],
    ["108","외상매출금","asset","유동자산"],["109","받을어음","asset","유동자산"],["110","미수금","asset","유동자산"],
    ["120","선급금","asset","유동자산"],["121","선급비용","asset","유동자산"],["124","부가세대급금","asset","유동자산"],
    ["201","건물","asset","비유동자산"],["202","차량운반구","asset","비유동자산"],["203","비품","asset","비유동자산"],
    ["210","건물감가상각누계액","asset","비유동자산"],["211","차량감가상각누계액","asset","비유동자산"],["212","비품감가상각누계액","asset","비유동자산"],
    ["251","외상매입금","liability","유동부채"],["252","지급어음","liability","유동부채"],["253","미지급금","liability","유동부채"],
    ["254","미지급비용","liability","유동부채"],["255","선수금","liability","유동부채"],["256","예수금","liability","유동부채"],
    ["257","부가세예수금","liability","유동부채"],["280","장기차입금","liability","비유동부채"],
    ["331","자본금","equity","자본금"],["341","이익잉여금","equity","이익잉여금"],
    ["401","상품매출","revenue","매출"],["404","용역매출","revenue","매출"],
    ["901","이자수익","revenue","영업외수익"],["902","잡이익","revenue","영업외수익"],
    ["501","상품매입","expense","매출원가"],
    ["801","급여","expense","판매비와관리비"],["803","퇴직급여","expense","판매비와관리비"],
    ["805","복리후생비","expense","판매비와관리비"],["807","보험료","expense","판매비와관리비"],
    ["811","여비교통비","expense","판매비와관리비"],["812","통신비","expense","판매비와관리비"],
    ["814","수도광열비","expense","판매비와관리비"],["818","접대비","expense","판매비와관리비"],
    ["820","감가상각비","expense","판매비와관리비"],["826","임차료","expense","판매비와관리비"],
    ["829","수선비","expense","판매비와관리비"],["830","세금과공과","expense","판매비와관리비"],
    ["831","소모품비","expense","판매비와관리비"],["832","지급수수료","expense","판매비와관리비"],
    ["840","광고선전비","expense","판매비와관리비"],["845","운반비","expense","판매비와관리비"],
    ["951","이자비용","expense","영업외비용"],
  ];

  const insert = _db.prepare("INSERT INTO chart_of_accounts (id,code,name,category,sub_category) VALUES (?,?,?,?,?)");
  const tx = _db.transaction(() => {
    for (const [code,name,cat,sub] of coa) insert.run(randomUUID(),code,name,cat,sub);
  });
  tx();
}

// ============ QUERY HELPERS ============

export function uuid(): string { return randomUUID(); }

export function queryAll<T = any>(sql: string, ...params: any[]): T[] {
  return getDb().prepare(sql).all(...params) as T[];
}

export function queryOne<T = any>(sql: string, ...params: any[]): T | undefined {
  return getDb().prepare(sql).get(...params) as T | undefined;
}

export function execute(sql: string, ...params: any[]) {
  return getDb().prepare(sql).run(...params);
}

export function runTransaction<T>(fn: () => T): T {
  return getDb().transaction(fn)();
}

// ============ 전기기간 검증 ============

export function checkFiscalPeriodOpen(date: string): void {
  const year = parseInt(date.substring(0, 4));
  const closed = queryOne<{ id: string }>(
    "SELECT id FROM fiscal_closings WHERE fiscal_year = ? AND status = 'closed'", year
  );
  if (closed) {
    throw new Error(`${year}년은 마감된 회계연도입니다. 전표를 입력할 수 없습니다.`);
  }
}

// ============ Audit Log ============

export function auditLog(tableName: string, recordId: string, action: string, oldData?: any, newData?: any) {
  execute(
    "INSERT INTO audit_logs (id, table_name, record_id, action, old_data, new_data) VALUES (?, ?, ?, ?, ?, ?)",
    uuid(), tableName, recordId, action,
    oldData ? JSON.stringify(oldData) : null,
    newData ? JSON.stringify(newData) : null
  );
}

// ============ Soft Delete Helper ============

export function softDelete(table: string, id: string) {
  execute(
    `UPDATE ${table} SET is_deleted = 1, deleted_at = CURRENT_TIMESTAMP WHERE id = ?`, id
  );
}

// ============ FK Existence Check ============

export function existsInTable(table: string, id: string): boolean {
  const row = queryOne<{ cnt: number }>(`SELECT COUNT(*) as cnt FROM ${table} WHERE id = ? AND (is_deleted = 0 OR is_deleted IS NULL)`, id);
  return (row?.cnt || 0) > 0;
}

// ============ 전표 번호 생성 ============

export function generateVoucherNo(date: string): string {
  const ym = date.substring(0, 7).replace("-", "");
  const count = queryOne<{ cnt: number }>(
    "SELECT COUNT(*) as cnt FROM vouchers WHERE voucher_date LIKE ? AND is_deleted = 0", `${date.substring(0, 7)}%`
  );
  const seq = ((count?.cnt || 0) + 1).toString().padStart(4, "0");
  return `${ym}-${seq}`;
}

// ============ 전표 생성 헬퍼 ============

export function createVoucher(data: {
  voucherType: "deposit" | "withdrawal" | "transfer" | "sale" | "purchase" | "general";
  voucherDate: string;
  description: string;
  isClosing?: boolean;
  saleId?: string | null;
  purchaseId?: string | null;
  accountId?: string | null;
  lines: {
    accountCode: string;
    accountName: string;
    debitAmount: number;
    creditAmount: number;
    clientId?: string | null;
    description?: string;
  }[];
}): string {
  const voucherId = uuid();
  const voucherNo = generateVoucherNo(data.voucherDate);

  const fiscalYear = parseInt(data.voucherDate.substring(0, 4));

  execute(
    `INSERT INTO vouchers (id, voucher_no, voucher_type, voucher_date, description, is_closing, sale_id, purchase_id, account_id, fiscal_year)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    voucherId, voucherNo, data.voucherType, data.voucherDate,
    data.description, data.isClosing ? 1 : 0,
    data.saleId || null, data.purchaseId || null, data.accountId || null,
    fiscalYear
  );

  const stmt = getDb().prepare(
    `INSERT INTO voucher_lines (id, voucher_id, account_code, account_name, debit_amount, credit_amount, client_id, description, line_order)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`
  );

  data.lines.forEach((line, idx) => {
    stmt.run(uuid(), voucherId, line.accountCode, line.accountName,
      line.debitAmount, line.creditAmount, line.clientId || null,
      line.description || null, idx);
  });

  return voucherId;
}
