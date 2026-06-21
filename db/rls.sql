-- RLS for companies
ALTER TABLE companies ENABLE ROW LEVEL SECURITY;

CREATE POLICY select_own_companies ON companies 
FOR SELECT 
USING (user_id = current_setting('request.jwt.claim.sub', true)::uuid);

CREATE POLICY manage_own_companies ON companies 
FOR ALL 
USING (user_id = current_setting('request.jwt.claim.sub', true)::uuid);

-- RLS for customers
ALTER TABLE customers ENABLE ROW LEVEL SECURITY;

CREATE POLICY select_own_company_customers ON customers 
FOR SELECT 
USING (
    company_id IN (
        SELECT id FROM companies WHERE user_id = current_setting('request.jwt.claim.sub', true)::uuid
    )
);

CREATE POLICY manage_own_company_customers ON customers 
FOR ALL 
USING (
    company_id IN (
        SELECT id FROM companies WHERE user_id = current_setting('request.jwt.claim.sub', true)::uuid
    )
);