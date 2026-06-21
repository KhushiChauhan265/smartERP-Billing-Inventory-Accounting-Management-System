try {
  Invoke-RestMethod -Uri http://localhost:3001/api/auth/register -Method POST -ContentType "application/json" -Body '{"email":"ledger_test@smarterp.com","password":"securepassword","fullName":"Ledger Tester"}' | Out-Null
} catch {}
$tokenResponse = Invoke-RestMethod -Uri http://localhost:3001/api/auth/login -Method POST -ContentType "application/json" -Body '{"email":"ledger_test@smarterp.com","password":"securepassword"}'
$token = $tokenResponse.token

Write-Output "--- CREATING COMPANY ---"
$companyBody = '{"company_name":"Ledger Co 1"}'
$comp = Invoke-RestMethod -Uri http://localhost:3001/api/companies -Method POST -ContentType "application/json" -Headers @{ "Authorization" = "Bearer $token" } -Body $companyBody
$companyId = $comp.company.id

Write-Output "--- CREATING LEDGER ---"
$ledgerBody = '{"companyId":"' + $companyId + '", "name":"Cash A/c", "code":"CASH001", "type":"ASSET", "openingBalance":10000, "openingBalanceType":"DEBIT"}'
$ledger = Invoke-RestMethod -Uri http://localhost:3001/api/ledgers -Method POST -ContentType "application/json" -Headers @{ "Authorization" = "Bearer $token" } -Body $ledgerBody
$ledgerId = $ledger.ledger.id
Write-Output "Created Ledger: $($ledger.ledger.name) with Balance $($ledger.ledger.opening_balance) $($ledger.ledger.opening_balance_type)"

Write-Output "--- LISTING LEDGERS ---"
$list = Invoke-RestMethod -Uri "http://localhost:3001/api/ledgers?companyId=$companyId" -Method GET -Headers @{ "Authorization" = "Bearer $token" }
Write-Output "Found $($list.ledgers.Length) ledgers"

Write-Output "--- UPDATING LEDGER ---"
$updateBody = '{"companyId":"' + $companyId + '", "name":"Cash Account Updated", "type":"ASSET", "openingBalance":15000, "openingBalanceType":"DEBIT"}'
$updated = Invoke-RestMethod -Uri "http://localhost:3001/api/ledgers/$ledgerId" -Method PUT -ContentType "application/json" -Headers @{ "Authorization" = "Bearer $token" } -Body $updateBody
Write-Output "Updated Ledger Name: $($updated.ledger.name)"

Write-Output "--- DELETING LEDGER ---"
$deleteUrl = "http://localhost:3001/api/ledgers/" + $ledgerId + "?companyId=" + $companyId
Write-Output "DELETE URL: $deleteUrl"
$del = Invoke-RestMethod -Uri $deleteUrl -Method DELETE -Headers @{ "Authorization" = "Bearer $token" }
Write-Output $del.message
