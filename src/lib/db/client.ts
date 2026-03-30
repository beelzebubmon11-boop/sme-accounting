import { createClient, type Client, type Transaction } from "@libsql/client";
import { AsyncLocalStorage } from "node:async_hooks";
import { randomUUID } from "crypto";
import { MIGRATIONS } from "./migrations";

let _client: Client | null = null;
let _initPromise: Promise<void> | null = null;
const txStore = new AsyncLocalStorage<Transaction>();

function getClient(): Client {
  if (_client) return _client;

  // Vercel serverless: writable filesystem is only /tmp
  const defaultPath = process.env.VERCEL ? "/tmp/dev-data.db" : "dev-data.db";
  const url = process.env.TURSO_DATABASE_URL
    || `file:${process.env.SME_DB_PATH || defaultPath}`;
  const authToken = process.env.TURSO_AUTH_TOKEN;

  _client = createClient({
    url,
    ...(authToken ? { authToken } : {}),
  });

  return _client;
}

async function ensureInit() {
  if (!_initPromise) {
    _initPromise = doInit().catch((err) => {
      _initPromise = null;
      throw err;
    });
  }
  await _initPromise;
}

async function doInit() {
  const db = getClient();
  try {
    if (!process.env.TURSO_DATABASE_URL) {
      await db.execute("PRAGMA journal_mode = WAL");
      await db.execute("PRAGMA foreign_keys = ON");
    }
    await runMigrations(db);
  } catch (e) {
    console.error("[DB init error]", e);
    throw e;
  }
}

function splitStatements(sql: string): string[] {
  // Remove SQL comments, then split by semicolons
  const lines = sql.split("\n");
  const cleaned = lines
    .map(line => {
      const commentIdx = line.indexOf("--");
      return commentIdx >= 0 ? line.substring(0, commentIdx) : line;
    })
    .join("\n");
  return cleaned
    .split(";")
    .map(s => s.trim())
    .filter(s => s.length > 0);
}

async function runMigrations(db: Client) {
  await db.execute(`CREATE TABLE IF NOT EXISTS _migrations (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL UNIQUE,
    applied_at DATETIME DEFAULT CURRENT_TIMESTAMP
  )`);

  const migrationNames = Object.keys(MIGRATIONS).sort();
  const result = await db.execute("SELECT name FROM _migrations");
  const applied = new Set(result.rows.map((r: any) => r.name));

  for (const name of migrationNames) {
    if (applied.has(name)) continue;
    const statements = splitStatements(MIGRATIONS[name]);
    for (const stmt of statements) {
      try {
        await db.execute(stmt);
      } catch (e: any) {
        const msg = e.message || "";
        // Ignore benign errors: duplicate columns, already exists, etc.
        if (msg.includes("duplicate column") || msg.includes("already exists") || msg.includes("table") && msg.includes("already")) {
          continue;
        }
        console.error(`[migration ${name}] Failed statement: ${stmt.substring(0, 100)}...`, e.message);
        throw e;
      }
    }
    await db.execute({ sql: "INSERT INTO _migrations (name) VALUES (?)", args: [name] });
  }

  await seedIfEmpty(db);
}

async function seedIfEmpty(db: Client) {
  const result = await db.execute("SELECT COUNT(*) as cnt FROM chart_of_accounts");
  const count = Number((result.rows[0] as any)?.cnt) || 0;
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

  const stmts = coa.map(([code, name, cat, sub]) => ({
    sql: "INSERT INTO chart_of_accounts (id,code,name,category,sub_category) VALUES (?,?,?,?,?)",
    args: [randomUUID(), code, name, cat, sub],
  }));

  await db.batch(stmts, "write");
}

// ============ QUERY HELPERS ============

export function uuid(): string { return randomUUID(); }

function getTarget(): Client | Transaction {
  return txStore.getStore() || getClient();
}

export async function queryAll<T = any>(sql: string, ...params: any[]): Promise<T[]> {
  await ensureInit();
  const result = await getTarget().execute({ sql, args: params });
  return result.rows as unknown as T[];
}

export async function queryOne<T = any>(sql: string, ...params: any[]): Promise<T | undefined> {
  await ensureInit();
  const result = await getTarget().execute({ sql, args: params });
  return result.rows[0] as unknown as T | undefined;
}

export async function execute(sql: string, ...params: any[]) {
  await ensureInit();
  return await getTarget().execute({ sql, args: params });
}

export async function runTransaction<T>(fn: () => Promise<T>): Promise<T> {
  await ensureInit();
  const db = getClient();
  const tx = await db.transaction("write");
  try {
    const result = await txStore.run(tx, fn);
    await tx.commit();
    return result;
  } catch (e) {
    await tx.rollback();
    throw e;
  }
}

// ============ 전기기간 검증 ============

export async function checkFiscalPeriodOpen(date: string): Promise<void> {
  const year = parseInt(date.substring(0, 4));
  const closed = await queryOne<{ id: string }>(
    "SELECT id FROM fiscal_closings WHERE fiscal_year = ? AND status = 'closed'", year
  );
  if (closed) {
    throw new Error(`${year}년은 마감된 회계연도입니다. 전표를 입력할 수 없습니다.`);
  }
}

// ============ Audit Log ============

export async function auditLog(tableName: string, recordId: string, action: string, oldData?: any, newData?: any) {
  await execute(
    "INSERT INTO audit_logs (id, table_name, record_id, action, old_data, new_data) VALUES (?, ?, ?, ?, ?, ?)",
    uuid(), tableName, recordId, action,
    oldData ? JSON.stringify(oldData) : null,
    newData ? JSON.stringify(newData) : null
  );
}

// ============ Soft Delete Helper ============

export async function softDelete(table: string, id: string) {
  await execute(
    `UPDATE ${table} SET is_deleted = 1, deleted_at = CURRENT_TIMESTAMP WHERE id = ?`, id
  );
}

// ============ FK Existence Check ============

export async function existsInTable(table: string, id: string): Promise<boolean> {
  const row = await queryOne<{ cnt: number }>(`SELECT COUNT(*) as cnt FROM ${table} WHERE id = ? AND (is_deleted = 0 OR is_deleted IS NULL)`, id);
  return (Number(row?.cnt) || 0) > 0;
}

// ============ 전표 번호 생성 ============

export async function generateVoucherNo(date: string): Promise<string> {
  const ym = date.substring(0, 7).replace("-", "");
  const count = await queryOne<{ cnt: number }>(
    "SELECT COUNT(*) as cnt FROM vouchers WHERE voucher_date LIKE ? AND is_deleted = 0", `${date.substring(0, 7)}%`
  );
  const seq = ((Number(count?.cnt) || 0) + 1).toString().padStart(4, "0");
  return `${ym}-${seq}`;
}

// ============ 전표 생성 헬퍼 ============

export async function createVoucher(data: {
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
}): Promise<string> {
  const voucherId = uuid();
  const voucherNo = await generateVoucherNo(data.voucherDate);
  const fiscalYear = parseInt(data.voucherDate.substring(0, 4));

  await execute(
    `INSERT INTO vouchers (id, voucher_no, voucher_type, voucher_date, description, is_closing, sale_id, purchase_id, account_id, fiscal_year)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    voucherId, voucherNo, data.voucherType, data.voucherDate,
    data.description, data.isClosing ? 1 : 0,
    data.saleId || null, data.purchaseId || null, data.accountId || null,
    fiscalYear
  );

  for (let idx = 0; idx < data.lines.length; idx++) {
    const line = data.lines[idx];
    await execute(
      `INSERT INTO voucher_lines (id, voucher_id, account_code, account_name, debit_amount, credit_amount, client_id, description, line_order)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      uuid(), voucherId, line.accountCode, line.accountName,
      line.debitAmount, line.creditAmount, line.clientId || null,
      line.description || null, idx
    );
  }

  return voucherId;
}
