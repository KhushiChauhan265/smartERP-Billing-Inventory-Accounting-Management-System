CREATE EXTENSION IF NOT EXISTS pgcrypto;

-- 1) users
CREATE TABLE users (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    email VARCHAR(255) UNIQUE NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    full_name VARCHAR(255),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 2) companies
CREATE TABLE companies (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES users(id) ON DELETE CASCADE NOT NULL,
    company_name VARCHAR(255) NOT NULL,
    address TEXT,
    gst_number VARCHAR(20),
    state VARCHAR(100),
    financial_year_start VARCHAR(10),
    financial_year_end VARCHAR(10),
    contact_number VARCHAR(20),
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX idx_companies_user_id ON companies(user_id);

-- 3) customers
CREATE TABLE customers (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    company_id UUID REFERENCES companies(id) ON DELETE CASCADE NOT NULL,
    customer_name VARCHAR(255) NOT NULL,
    code VARCHAR(50),
    contact_person VARCHAR(255),
    mobile_number VARCHAR(20),
    email VARCHAR(255),
    address TEXT,
    gstin VARCHAR(20),
    opening_balance DECIMAL(14, 2) DEFAULT 0,
    opening_balance_type VARCHAR(10) DEFAULT 'DEBIT' CHECK (opening_balance_type IN ('DEBIT', 'CREDIT')),
    is_active BOOLEAN DEFAULT true,
    ledger_id UUID REFERENCES ledgers(id) ON DELETE SET NULL,
    group_id UUID REFERENCES account_groups(id) ON DELETE SET NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE (company_id, customer_name)
);
CREATE INDEX idx_customers_company_id ON customers(company_id);
CREATE INDEX idx_customers_customer_name ON customers(customer_name);

-- 4) suppliers
CREATE TABLE suppliers (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    company_id UUID REFERENCES companies(id) ON DELETE CASCADE NOT NULL,
    supplier_name VARCHAR(255) NOT NULL,
    code VARCHAR(50),
    contact_person VARCHAR(255),
    mobile_number VARCHAR(20),
    email VARCHAR(255),
    address TEXT,
    gstin VARCHAR(20),
    opening_balance DECIMAL(14, 2) DEFAULT 0,
    opening_balance_type VARCHAR(10) DEFAULT 'CREDIT' CHECK (opening_balance_type IN ('DEBIT', 'CREDIT')),
    is_active BOOLEAN DEFAULT true,
    ledger_id UUID REFERENCES ledgers(id) ON DELETE SET NULL,
    group_id UUID REFERENCES account_groups(id) ON DELETE SET NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE (company_id, supplier_name)
);
CREATE INDEX idx_suppliers_company_id ON suppliers(company_id);
CREATE INDEX idx_suppliers_supplier_name ON suppliers(supplier_name);

-- 5) items (stock)
CREATE TABLE items (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    company_id UUID REFERENCES companies(id) ON DELETE CASCADE NOT NULL,
    item_name VARCHAR(255) NOT NULL,
    sku VARCHAR(100),
    barcode VARCHAR(100),
    hsn_sac VARCHAR(50),
    unit_name VARCHAR(50) DEFAULT 'PCS',
    category VARCHAR(100),
    purchase_price DECIMAL(10, 2) NOT NULL DEFAULT 0,
    selling_price DECIMAL(10, 2) NOT NULL DEFAULT 0,
    opening_stock INTEGER DEFAULT 0,
    quantity INTEGER NOT NULL DEFAULT 0,
    reorder_level INTEGER DEFAULT 0,
    is_active BOOLEAN DEFAULT true,
    gst_percentage DECIMAL(5, 2) DEFAULT 0,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE (company_id, sku)
);
CREATE INDEX idx_items_company_id ON items(company_id);
CREATE INDEX idx_items_item_name ON items(item_name);

-- 5b) stock_movements
CREATE TABLE stock_movements (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    company_id UUID REFERENCES companies(id) ON DELETE CASCADE NOT NULL,
    item_id UUID REFERENCES items(id) ON DELETE CASCADE NOT NULL,
    voucher_type VARCHAR(50) NOT NULL, -- 'PURCHASE', 'SALES', 'OPENING', 'ADJUSTMENT'
    voucher_id UUID,
    qty_in INTEGER DEFAULT 0,
    qty_out INTEGER DEFAULT 0,
    rate DECIMAL(10, 2) DEFAULT 0,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX idx_stock_movements_company_id ON stock_movements(company_id);
CREATE INDEX idx_stock_movements_item_id ON stock_movements(item_id);

CREATE OR REPLACE FUNCTION update_item_quantity()
RETURNS TRIGGER AS $$
BEGIN
    IF (TG_OP = 'INSERT') THEN
        UPDATE items 
        SET quantity = quantity + NEW.qty_in - NEW.qty_out
        WHERE id = NEW.item_id;
    ELSIF (TG_OP = 'UPDATE') THEN
        UPDATE items 
        SET quantity = quantity - OLD.qty_in + OLD.qty_out + NEW.qty_in - NEW.qty_out
        WHERE id = NEW.item_id;
    ELSIF (TG_OP = 'DELETE') THEN
        UPDATE items 
        SET quantity = quantity - OLD.qty_in + OLD.qty_out
        WHERE id = OLD.item_id;
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_stock_movements_qty_update
AFTER INSERT OR UPDATE OR DELETE ON stock_movements
FOR EACH ROW EXECUTE FUNCTION update_item_quantity();

-- 6) purchase_vouchers
CREATE TABLE purchase_vouchers (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    company_id UUID REFERENCES companies(id) ON DELETE CASCADE NOT NULL,
    voucher_number VARCHAR(50) NOT NULL,
    purchase_date DATE NOT NULL,
    supplier_id UUID REFERENCES suppliers(id) ON DELETE CASCADE NOT NULL,
    total_amount DECIMAL(10, 2) NOT NULL DEFAULT 0,
    gst_amount DECIMAL(10, 2) NOT NULL DEFAULT 0,
    gross_total DECIMAL(10, 2) NOT NULL DEFAULT 0,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX idx_purchase_vouchers_company_id ON purchase_vouchers(company_id);
CREATE INDEX idx_purchase_vouchers_date ON purchase_vouchers(purchase_date);

-- 7) purchase_voucher_items
CREATE TABLE purchase_voucher_items (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    purchase_voucher_id UUID REFERENCES purchase_vouchers(id) ON DELETE CASCADE NOT NULL,
    item_id UUID REFERENCES items(id) ON DELETE CASCADE NOT NULL,
    quantity INTEGER NOT NULL,
    rate DECIMAL(10, 2) NOT NULL,
    amount DECIMAL(10, 2) NOT NULL,
    gst_percentage DECIMAL(5, 2) DEFAULT 0,
    gst_amount DECIMAL(10, 2) DEFAULT 0,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX idx_pv_items_voucher_id ON purchase_voucher_items(purchase_voucher_id);
CREATE INDEX idx_pv_items_item_id ON purchase_voucher_items(item_id);

-- 8) sales_vouchers
CREATE TABLE sales_vouchers (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    company_id UUID REFERENCES companies(id) ON DELETE CASCADE NOT NULL,
    invoice_number VARCHAR(50) NOT NULL,
    invoice_date DATE NOT NULL,
    customer_id UUID REFERENCES customers(id) ON DELETE CASCADE NOT NULL,
    total_amount DECIMAL(10, 2) NOT NULL DEFAULT 0,
    gst_amount DECIMAL(10, 2) NOT NULL DEFAULT 0,
    gross_total DECIMAL(10, 2) NOT NULL DEFAULT 0,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX idx_sales_vouchers_company_id ON sales_vouchers(company_id);
CREATE INDEX idx_sales_vouchers_date ON sales_vouchers(invoice_date);

-- 9) sales_voucher_items
CREATE TABLE sales_voucher_items (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    sales_voucher_id UUID REFERENCES sales_vouchers(id) ON DELETE CASCADE NOT NULL,
    item_id UUID REFERENCES items(id) ON DELETE CASCADE NOT NULL,
    quantity INTEGER NOT NULL,
    rate DECIMAL(10, 2) NOT NULL,
    amount DECIMAL(10, 2) NOT NULL,
    gst_percentage DECIMAL(5, 2) DEFAULT 0,
    gst_amount DECIMAL(10, 2) DEFAULT 0,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX idx_sv_items_voucher_id ON sales_voucher_items(sales_voucher_id);
CREATE INDEX idx_sv_items_item_id ON sales_voucher_items(item_id);

-- 10) account_groups
DROP TABLE IF EXISTS groups CASCADE;
CREATE TABLE account_groups (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    company_id UUID REFERENCES companies(id) ON DELETE CASCADE NOT NULL,
    name VARCHAR(255) NOT NULL,
    code VARCHAR(50),
    type VARCHAR(50) NOT NULL CHECK (type IN ('ASSET', 'LIABILITY', 'EQUITY', 'INCOME', 'EXPENSE')),
    parent_group_id UUID REFERENCES account_groups(id) ON DELETE SET NULL,
    is_primary BOOLEAN DEFAULT false,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE (company_id, name)
);
CREATE INDEX idx_account_groups_company_id ON account_groups(company_id);
CREATE INDEX idx_account_groups_parent_id ON account_groups(parent_group_id);

-- 11) Updated_at trigger function
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Apply triggers
CREATE TRIGGER update_users_modtime BEFORE UPDATE ON users FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_companies_modtime BEFORE UPDATE ON companies FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_customers_modtime BEFORE UPDATE ON customers FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_suppliers_modtime BEFORE UPDATE ON suppliers FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_items_modtime BEFORE UPDATE ON items FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_purchase_vouchers_modtime BEFORE UPDATE ON purchase_vouchers FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_sales_vouchers_modtime BEFORE UPDATE ON sales_vouchers FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_account_groups_modtime BEFORE UPDATE ON account_groups FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- 12) ledgers
CREATE TABLE ledgers (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    company_id UUID REFERENCES companies(id) ON DELETE CASCADE NOT NULL,
    name VARCHAR(255) NOT NULL,
    code VARCHAR(50),
    type VARCHAR(50) NOT NULL CHECK (type IN ('ASSET', 'LIABILITY', 'EQUITY', 'INCOME', 'EXPENSE')),
    group_name VARCHAR(255),
    opening_balance DECIMAL(14, 2) DEFAULT 0,
    opening_balance_type VARCHAR(10) DEFAULT 'DEBIT' CHECK (opening_balance_type IN ('DEBIT', 'CREDIT')),
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE (company_id, name)
);
CREATE INDEX idx_ledgers_company_id ON ledgers(company_id);
CREATE TRIGGER update_ledgers_modtime BEFORE UPDATE ON ledgers FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();