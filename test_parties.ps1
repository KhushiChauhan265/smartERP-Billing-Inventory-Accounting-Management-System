try {
  Invoke-RestMethod -Uri http://localhost:3001/api/auth/register -Method POST -ContentType "application/json" -Body '{"email":"party_test@smarterp.com","password":"securepassword","fullName":"Party Tester"}' | Out-Null
} catch {}
$tokenResponse = Invoke-RestMethod -Uri http://localhost:3001/api/auth/login -Method POST -ContentType "application/json" -Body '{"email":"party_test@smarterp.com","password":"securepassword"}'
$token = $tokenResponse.token

Write-Output "--- CREATING COMPANY ---"
$companyBody = '{"company_name":"Party Co 1"}'
$comp = Invoke-RestMethod -Uri http://localhost:3001/api/companies -Method POST -ContentType "application/json" -Headers @{ "Authorization" = "Bearer $token" } -Body $companyBody
$companyId = $comp.company.id

Write-Output "--- CREATING CUSTOMER ---"
$custBody = '{"companyId":"' + $companyId + '", "name":"Acme Corp", "code":"ACME", "openingBalance":1000, "openingBalanceType":"DEBIT"}'
$cust = Invoke-RestMethod -Uri http://localhost:3001/api/customers -Method POST -ContentType "application/json" -Headers @{ "Authorization" = "Bearer $token" } -Body $custBody
$custId = $cust.customer.id
Write-Output "Created Customer: $($cust.customer.customer_name) (Ledger ID: $($cust.customer.ledger_id))"

Write-Output "--- CREATING SUPPLIER ---"
$supBody = '{"companyId":"' + $companyId + '", "name":"Stark Industries", "code":"STARK", "openingBalance":5000, "openingBalanceType":"CREDIT"}'
$sup = Invoke-RestMethod -Uri http://localhost:3001/api/suppliers -Method POST -ContentType "application/json" -Headers @{ "Authorization" = "Bearer $token" } -Body $supBody
$supId = $sup.supplier.id
Write-Output "Created Supplier: $($sup.supplier.supplier_name) (Ledger ID: $($sup.supplier.ledger_id))"

Write-Output "--- LISTING PARTIES ---"
$clist = Invoke-RestMethod -Uri "http://localhost:3001/api/customers?companyId=$companyId" -Method GET -Headers @{ "Authorization" = "Bearer $token" }
Write-Output "Found $($clist.customers.Length) customers"

$slist = Invoke-RestMethod -Uri "http://localhost:3001/api/suppliers?companyId=$companyId" -Method GET -Headers @{ "Authorization" = "Bearer $token" }
Write-Output "Found $($slist.suppliers.Length) suppliers"

Write-Output "--- UPDATING CUSTOMER ---"
$updateBody = '{"companyId":"' + $companyId + '", "name":"Acme Corporation", "openingBalance":2000}'
$updated = Invoke-RestMethod -Uri "http://localhost:3001/api/customers/$custId" -Method PUT -ContentType "application/json" -Headers @{ "Authorization" = "Bearer $token" } -Body $updateBody
Write-Output "Updated Customer Name: $($updated.customer.customer_name)"

Write-Output "--- DELETING CUSTOMER ---"
$delUrl = "http://localhost:3001/api/customers/" + $custId + "?companyId=" + $companyId
$del = Invoke-RestMethod -Uri $delUrl -Method DELETE -Headers @{ "Authorization" = "Bearer $token" }
Write-Output $del.message
