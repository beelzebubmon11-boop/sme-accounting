-- =============================================
-- Migration 003: Schema Enhancements
-- audit_log, soft delete, posting period enforcement,
-- indexes, CHECK constraints, reversal support
-- =============================================

-- =============================================
-- 1. Audit Log (감사추적)
-- =============================================
CREATE TABLE IF NOT EXISTS audit_logs (
  id TEXT PRIMARY KEY,
  table_name TEXT NOT NULL,
  record_id TEXT NOT NULL,
  action TEXT NOT NULL CHECK (action IN ('INSERT','UPDATE','DELETE')),
  old_data TEXT, -- JSON snapshot before change
  new_data TEXT, -- JSON snapshot after change
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_audit_table ON audit_logs(table_name, record_id);
CREATE INDEX IF NOT EXISTS idx_audit_date ON audit_logs(created_at);

-- =============================================
-- 2. Soft Delete columns
-- =============================================
-- vouchers
ALTER TABLE vouchers ADD COLUMN is_deleted INTEGER NOT NULL DEFAULT 0;
ALTER TABLE vouchers ADD COLUMN deleted_at DATETIME;

-- sales
ALTER TABLE sales ADD COLUMN is_deleted INTEGER NOT NULL DEFAULT 0;
ALTER TABLE sales ADD COLUMN deleted_at DATETIME;

-- purchases
ALTER TABLE purchases ADD COLUMN is_deleted INTEGER NOT NULL DEFAULT 0;
ALTER TABLE purchases ADD COLUMN deleted_at DATETIME;

-- clients
ALTER TABLE clients ADD COLUMN is_deleted INTEGER NOT NULL DEFAULT 0;
ALTER TABLE clients ADD COLUMN deleted_at DATETIME;

-- accounts
ALTER TABLE accounts ADD COLUMN is_deleted INTEGER NOT NULL DEFAULT 0;
ALTER TABLE accounts ADD COLUMN deleted_at DATETIME;

-- =============================================
-- 3. Reversal (역분개) support
-- =============================================
ALTER TABLE vouchers ADD COLUMN is_reversal INTEGER NOT NULL DEFAULT 0;
ALTER TABLE vouchers ADD COLUMN reversal_of TEXT REFERENCES vouchers(id);

-- =============================================
-- 4. Fiscal year on vouchers for period lock
-- =============================================
ALTER TABLE vouchers ADD COLUMN fiscal_year INTEGER;

-- Backfill fiscal_year from voucher_date
UPDATE vouchers SET fiscal_year = CAST(strftime('%Y', voucher_date) AS INTEGER) WHERE fiscal_year IS NULL;

-- =============================================
-- 5. Missing Indexes
-- =============================================
CREATE INDEX IF NOT EXISTS idx_sales_status ON sales(status);
CREATE INDEX IF NOT EXISTS idx_sales_client ON sales(client_id);
CREATE INDEX IF NOT EXISTS idx_purchases_status ON purchases(status);
CREATE INDEX IF NOT EXISTS idx_purchases_client ON purchases(client_id);
CREATE INDEX IF NOT EXISTS idx_coa_category ON chart_of_accounts(category);
CREATE INDEX IF NOT EXISTS idx_coa_active ON chart_of_accounts(is_active);
CREATE INDEX IF NOT EXISTS idx_vat_status ON vat_periods(status);
CREATE INDEX IF NOT EXISTS idx_fiscal_status ON fiscal_closings(status);
CREATE INDEX IF NOT EXISTS idx_fiscal_year ON fiscal_closings(fiscal_year);
CREATE INDEX IF NOT EXISTS idx_accounts_active ON accounts(is_active);
CREATE INDEX IF NOT EXISTS idx_vouchers_closing ON vouchers(is_closing);
CREATE INDEX IF NOT EXISTS idx_vouchers_deleted ON vouchers(is_deleted);
CREATE INDEX IF NOT EXISTS idx_vouchers_fiscal ON vouchers(fiscal_year);
CREATE INDEX IF NOT EXISTS idx_fixed_assets_status ON fixed_assets(status);
CREATE INDEX IF NOT EXISTS idx_opening_fiscal ON opening_balances(fiscal_year);

-- =============================================
-- 6. CHECK constraints on amounts via triggers
--    (SQLite doesn't support ALTER TABLE ADD CHECK)
-- =============================================

-- Prevent voucher_lines with both debit and credit = 0
-- (fix the existing CHECK that allows both 0)
CREATE TRIGGER IF NOT EXISTS trg_vl_no_zero
BEFORE INSERT ON voucher_lines
WHEN NEW.debit_amount = 0 AND NEW.credit_amount = 0
BEGIN
  SELECT RAISE(ABORT, '차변 또는 대변 금액을 입력하세요.');
END;

-- Prevent negative amounts
CREATE TRIGGER IF NOT EXISTS trg_vl_no_negative
BEFORE INSERT ON voucher_lines
WHEN NEW.debit_amount < 0 OR NEW.credit_amount < 0
BEGIN
  SELECT RAISE(ABORT, '음수 금액은 허용되지 않습니다.');
END;

-- Validate sales amounts
CREATE TRIGGER IF NOT EXISTS trg_sales_amount_check
BEFORE INSERT ON sales
WHEN NEW.supply_amount <= 0 OR NEW.total_amount <= 0
BEGIN
  SELECT RAISE(ABORT, '공급가액과 합계금액은 0보다 커야 합니다.');
END;

-- Validate purchases amounts
CREATE TRIGGER IF NOT EXISTS trg_purchases_amount_check
BEFORE INSERT ON purchases
WHEN NEW.supply_amount <= 0 OR NEW.total_amount <= 0
BEGIN
  SELECT RAISE(ABORT, '공급가액과 합계금액은 0보다 커야 합니다.');
END;

-- Validate fixed_assets
CREATE TRIGGER IF NOT EXISTS trg_assets_check
BEFORE INSERT ON fixed_assets
WHEN NEW.useful_life <= 0 OR NEW.acquisition_cost <= 0
BEGIN
  SELECT RAISE(ABORT, '취득원가와 내용연수는 0보다 커야 합니다.');
END;

-- =============================================
-- 7. Posting Period Lock Trigger
--    Prevent voucher insert/update in closed fiscal years
-- =============================================

CREATE TRIGGER IF NOT EXISTS trg_voucher_period_lock_insert
BEFORE INSERT ON vouchers
WHEN EXISTS (
  SELECT 1 FROM fiscal_closings
  WHERE fiscal_year = CAST(strftime('%Y', NEW.voucher_date) AS INTEGER)
  AND status = 'closed'
)
BEGIN
  SELECT RAISE(ABORT, '마감된 회계연도에는 전표를 입력할 수 없습니다.');
END;

CREATE TRIGGER IF NOT EXISTS trg_voucher_period_lock_update
BEFORE UPDATE ON vouchers
WHEN EXISTS (
  SELECT 1 FROM fiscal_closings
  WHERE fiscal_year = CAST(strftime('%Y', NEW.voucher_date) AS INTEGER)
  AND status = 'closed'
)
BEGIN
  SELECT RAISE(ABORT, '마감된 회계연도의 전표는 수정할 수 없습니다.');
END;

-- Prevent deleting vouchers in closed periods
CREATE TRIGGER IF NOT EXISTS trg_voucher_period_lock_delete
BEFORE DELETE ON vouchers
WHEN EXISTS (
  SELECT 1 FROM fiscal_closings
  WHERE fiscal_year = CAST(strftime('%Y', OLD.voucher_date) AS INTEGER)
  AND status = 'closed'
)
BEGIN
  SELECT RAISE(ABORT, '마감된 회계연도의 전표는 삭제할 수 없습니다.');
END;

-- =============================================
-- 8. Auto-set fiscal_year on voucher insert
-- =============================================
CREATE TRIGGER IF NOT EXISTS trg_voucher_set_fiscal_year
AFTER INSERT ON vouchers
WHEN NEW.fiscal_year IS NULL
BEGIN
  UPDATE vouchers SET fiscal_year = CAST(strftime('%Y', NEW.voucher_date) AS INTEGER)
  WHERE id = NEW.id;
END;

-- =============================================
-- 9. Audit triggers for vouchers
-- =============================================
CREATE TRIGGER IF NOT EXISTS trg_audit_voucher_insert
AFTER INSERT ON vouchers
BEGIN
  INSERT INTO audit_logs (id, table_name, record_id, action, new_data)
  VALUES (
    lower(hex(randomblob(4)) || '-' || hex(randomblob(2)) || '-4' || substr(hex(randomblob(2)),2) || '-' || substr('89ab',abs(random()) % 4 + 1, 1) || substr(hex(randomblob(2)),2) || '-' || hex(randomblob(6))),
    'vouchers', NEW.id, 'INSERT',
    json_object('voucher_no', NEW.voucher_no, 'voucher_type', NEW.voucher_type, 'voucher_date', NEW.voucher_date, 'description', NEW.description)
  );
END;

CREATE TRIGGER IF NOT EXISTS trg_audit_voucher_delete
BEFORE DELETE ON vouchers
BEGIN
  INSERT INTO audit_logs (id, table_name, record_id, action, old_data)
  VALUES (
    lower(hex(randomblob(4)) || '-' || hex(randomblob(2)) || '-4' || substr(hex(randomblob(2)),2) || '-' || substr('89ab',abs(random()) % 4 + 1, 1) || substr(hex(randomblob(2)),2) || '-' || hex(randomblob(6))),
    'vouchers', OLD.id, 'DELETE',
    json_object('voucher_no', OLD.voucher_no, 'voucher_type', OLD.voucher_type, 'voucher_date', OLD.voucher_date, 'description', OLD.description)
  );
END;

-- =============================================
-- 10. Audit triggers for sales/purchases
-- =============================================
CREATE TRIGGER IF NOT EXISTS trg_audit_sales_insert
AFTER INSERT ON sales
BEGIN
  INSERT INTO audit_logs (id, table_name, record_id, action, new_data)
  VALUES (
    lower(hex(randomblob(4)) || '-' || hex(randomblob(2)) || '-4' || substr(hex(randomblob(2)),2) || '-' || substr('89ab',abs(random()) % 4 + 1, 1) || substr(hex(randomblob(2)),2) || '-' || hex(randomblob(6))),
    'sales', NEW.id, 'INSERT',
    json_object('client_id', NEW.client_id, 'total_amount', NEW.total_amount, 'sale_date', NEW.sale_date)
  );
END;

CREATE TRIGGER IF NOT EXISTS trg_audit_purchases_insert
AFTER INSERT ON purchases
BEGIN
  INSERT INTO audit_logs (id, table_name, record_id, action, new_data)
  VALUES (
    lower(hex(randomblob(4)) || '-' || hex(randomblob(2)) || '-4' || substr(hex(randomblob(2)),2) || '-' || substr('89ab',abs(random()) % 4 + 1, 1) || substr(hex(randomblob(2)),2) || '-' || hex(randomblob(6))),
    'purchases', NEW.id, 'INSERT',
    json_object('client_id', NEW.client_id, 'total_amount', NEW.total_amount, 'purchase_date', NEW.purchase_date)
  );
END;

-- =============================================
-- 11. Drop broken triggers and fix
-- =============================================
-- The old triggers on vouchers for balance update
-- conflict with the action-level balance updates.
-- Remove them to prevent double-counting.
DROP TRIGGER IF EXISTS trg_voucher_insert_deposit;
DROP TRIGGER IF EXISTS trg_voucher_insert_withdrawal;
