-- =============================================
-- SME Accounting - Complete SQLite Schema v3
-- 더존/WEHAGO급 복식부기 회계 시스템
-- =============================================

-- 회사 정보
CREATE TABLE IF NOT EXISTS profiles (
  id TEXT PRIMARY KEY DEFAULT 'default',
  company_name TEXT NOT NULL DEFAULT '내 회사',
  business_number TEXT,
  representative_name TEXT,
  business_type TEXT,
  business_category TEXT,
  address TEXT,
  phone TEXT,
  fiscal_year_start TEXT DEFAULT '01',
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);
INSERT OR IGNORE INTO profiles (id) VALUES ('default');

-- 계정과목
CREATE TABLE IF NOT EXISTS chart_of_accounts (
  id TEXT PRIMARY KEY,
  code TEXT NOT NULL UNIQUE,
  name TEXT NOT NULL,
  category TEXT NOT NULL CHECK (category IN ('asset','liability','equity','revenue','expense')),
  sub_category TEXT,
  is_active INTEGER DEFAULT 1,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- 거래처
CREATE TABLE IF NOT EXISTS clients (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  client_type TEXT DEFAULT 'both' CHECK (client_type IN ('customer','vendor','both')),
  business_number TEXT,
  representative_name TEXT,
  contact_phone TEXT,
  contact_email TEXT,
  address TEXT,
  memo TEXT,
  is_active INTEGER NOT NULL DEFAULT 1,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- 적요/카테고리
CREATE TABLE IF NOT EXISTS categories (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  type TEXT NOT NULL CHECK (type IN ('income','expense','transfer')),
  account_code TEXT,
  account_name TEXT,
  is_default INTEGER DEFAULT 0,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- 은행 계좌 (통장)
CREATE TABLE IF NOT EXISTS accounts (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  bank_name TEXT NOT NULL,
  account_number TEXT,
  account_type TEXT NOT NULL DEFAULT 'checking',
  account_code TEXT DEFAULT '103',
  initial_balance INTEGER NOT NULL DEFAULT 0,
  current_balance INTEGER NOT NULL DEFAULT 0,
  is_active INTEGER NOT NULL DEFAULT 1,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- =============================================
-- 전표 시스템 (핵심 - 더존 방식)
-- =============================================

-- 전표 헤더
CREATE TABLE IF NOT EXISTS vouchers (
  id TEXT PRIMARY KEY,
  voucher_no TEXT NOT NULL,
  voucher_type TEXT NOT NULL CHECK (voucher_type IN ('deposit','withdrawal','transfer','sale','purchase','general')),
  voucher_date DATE NOT NULL,
  description TEXT,
  is_closing INTEGER DEFAULT 0,
  sale_id TEXT REFERENCES sales(id) ON DELETE SET NULL,
  purchase_id TEXT REFERENCES purchases(id) ON DELETE SET NULL,
  account_id TEXT REFERENCES accounts(id) ON DELETE SET NULL,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_vouchers_date ON vouchers(voucher_date);
CREATE INDEX IF NOT EXISTS idx_vouchers_type ON vouchers(voucher_type);
CREATE INDEX IF NOT EXISTS idx_vouchers_no ON vouchers(voucher_no);

-- 전표 라인 (차변/대변)
CREATE TABLE IF NOT EXISTS voucher_lines (
  id TEXT PRIMARY KEY,
  voucher_id TEXT NOT NULL REFERENCES vouchers(id) ON DELETE CASCADE,
  account_code TEXT NOT NULL,
  account_name TEXT NOT NULL,
  debit_amount INTEGER NOT NULL DEFAULT 0,
  credit_amount INTEGER NOT NULL DEFAULT 0,
  client_id TEXT REFERENCES clients(id) ON DELETE SET NULL,
  description TEXT,
  line_order INTEGER NOT NULL DEFAULT 0,
  CHECK (
    (debit_amount > 0 AND credit_amount = 0) OR
    (debit_amount = 0 AND credit_amount > 0) OR
    (debit_amount = 0 AND credit_amount = 0)
  )
);

CREATE INDEX IF NOT EXISTS idx_vl_voucher ON voucher_lines(voucher_id);
CREATE INDEX IF NOT EXISTS idx_vl_account ON voucher_lines(account_code);
CREATE INDEX IF NOT EXISTS idx_vl_client ON voucher_lines(client_id);

-- =============================================
-- 매출/매입
-- =============================================

CREATE TABLE IF NOT EXISTS sales (
  id TEXT PRIMARY KEY,
  client_id TEXT NOT NULL REFERENCES clients(id) ON DELETE RESTRICT,
  sale_date DATE NOT NULL,
  item_description TEXT NOT NULL,
  supply_amount INTEGER NOT NULL,
  tax_amount INTEGER NOT NULL DEFAULT 0,
  total_amount INTEGER NOT NULL,
  is_tax_invoice INTEGER DEFAULT 0,
  invoice_number TEXT,
  status TEXT NOT NULL DEFAULT 'unpaid' CHECK (status IN ('unpaid','partial','paid')),
  memo TEXT,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_sales_date ON sales(sale_date DESC);

CREATE TABLE IF NOT EXISTS purchases (
  id TEXT PRIMARY KEY,
  client_id TEXT NOT NULL REFERENCES clients(id) ON DELETE RESTRICT,
  purchase_date DATE NOT NULL,
  item_description TEXT NOT NULL,
  supply_amount INTEGER NOT NULL,
  tax_amount INTEGER NOT NULL DEFAULT 0,
  total_amount INTEGER NOT NULL,
  is_tax_invoice INTEGER DEFAULT 0,
  invoice_number TEXT,
  status TEXT NOT NULL DEFAULT 'unpaid' CHECK (status IN ('unpaid','partial','paid')),
  memo TEXT,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_purchases_date ON purchases(purchase_date DESC);

-- =============================================
-- 고정자산
-- =============================================

CREATE TABLE IF NOT EXISTS fixed_assets (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  asset_code TEXT,
  account_code TEXT NOT NULL,
  account_name TEXT NOT NULL,
  acquisition_date DATE NOT NULL,
  acquisition_cost INTEGER NOT NULL,
  useful_life INTEGER NOT NULL,
  depreciation_method TEXT NOT NULL DEFAULT 'straight' CHECK (depreciation_method IN ('straight','declining')),
  salvage_value INTEGER NOT NULL DEFAULT 0,
  accumulated_depreciation INTEGER NOT NULL DEFAULT 0,
  book_value INTEGER NOT NULL,
  status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active','disposed')),
  disposal_date DATE,
  disposal_amount INTEGER,
  memo TEXT,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- =============================================
-- 부가세 신고 기간
-- =============================================

CREATE TABLE IF NOT EXISTS vat_periods (
  id TEXT PRIMARY KEY,
  period_name TEXT NOT NULL,
  start_date DATE NOT NULL,
  end_date DATE NOT NULL,
  period_type TEXT NOT NULL CHECK (period_type IN ('preliminary','confirmed')),
  status TEXT NOT NULL DEFAULT 'open' CHECK (status IN ('open','closed')),
  total_sales_tax INTEGER DEFAULT 0,
  total_purchase_tax INTEGER DEFAULT 0,
  tax_payable INTEGER DEFAULT 0,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- =============================================
-- 결산
-- =============================================

CREATE TABLE IF NOT EXISTS fiscal_closings (
  id TEXT PRIMARY KEY,
  fiscal_year INTEGER NOT NULL,
  closing_date DATE NOT NULL,
  status TEXT NOT NULL DEFAULT 'open' CHECK (status IN ('open','closed')),
  closed_at DATETIME,
  memo TEXT,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- 기초잔액 (전기이월)
CREATE TABLE IF NOT EXISTS opening_balances (
  id TEXT PRIMARY KEY,
  fiscal_year INTEGER NOT NULL,
  account_code TEXT NOT NULL,
  account_name TEXT NOT NULL,
  debit_balance INTEGER NOT NULL DEFAULT 0,
  credit_balance INTEGER NOT NULL DEFAULT 0,
  UNIQUE(fiscal_year, account_code)
);

-- =============================================
-- 통장 잔액 자동 갱신 트리거
-- =============================================

-- 입금 전표 시 계좌 잔액 증가 (voucher_type = 'deposit')
CREATE TRIGGER IF NOT EXISTS trg_voucher_insert_deposit
AFTER INSERT ON vouchers
WHEN NEW.voucher_type = 'deposit' AND NEW.account_id IS NOT NULL
BEGIN
  UPDATE accounts SET
    current_balance = current_balance + (
      SELECT COALESCE(SUM(debit_amount), 0) FROM voucher_lines WHERE voucher_id = NEW.id AND account_code = (SELECT account_code FROM accounts WHERE id = NEW.account_id)
    ),
    updated_at = CURRENT_TIMESTAMP
  WHERE id = NEW.account_id;
END;

-- 출금 전표 시 계좌 잔액 감소 (voucher_type = 'withdrawal')
CREATE TRIGGER IF NOT EXISTS trg_voucher_insert_withdrawal
AFTER INSERT ON vouchers
WHEN NEW.voucher_type = 'withdrawal' AND NEW.account_id IS NOT NULL
BEGIN
  UPDATE accounts SET
    current_balance = current_balance - (
      SELECT COALESCE(SUM(credit_amount), 0) FROM voucher_lines WHERE voucher_id = NEW.id AND account_code = (SELECT account_code FROM accounts WHERE id = NEW.account_id)
    ),
    updated_at = CURRENT_TIMESTAMP
  WHERE id = NEW.account_id;
END;
