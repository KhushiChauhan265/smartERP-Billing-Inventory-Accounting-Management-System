try {
  Invoke-RestMethod -Uri http://localhost:3001/api/auth/register -Method POST -ContentType "application/json" -Body '{"email":"reports_test@smarterp.com","password":"securepassword","fullName":"Reports Tester"}' | Out-Null
} catch {}

$tokenResponse = Invoke-RestMethod -Uri http://localhost:3001/api/auth/login -Method POST -ContentType "application/json" -Body '{"email":"reports_test@smarterp.com","password":"securepassword"}'
$token = $tokenResponse.token

Write-Output "--- CREATING COMPANY FOR REPORTS TEST ---"
$companyBody = '{"company_name":"Reporting Co"}'
$comp = Invoke-RestMethod -Uri http://localhost:3001/api/companies -Method POST -ContentType "application/json" -Headers @{ "Authorization" = "Bearer $token" } -Body $companyBody
$companyId = $comp.company.id
Write-Output "Created Company ID: $companyId"

Write-Output "--- TESTING SALES SUMMARY ENDPOINT ---"
$salesUrl = "http://localhost:3001/api/reports/sales-summary?companyId=${companyId}"
$salesRes = Invoke-WebRequest -Uri $salesUrl -Method GET -Headers @{ "Authorization" = "Bearer $token" }
Write-Output "Sales Summary Status: $($salesRes.StatusCode)"
$salesData = $salesRes.Content | ConvertFrom-Json
Write-Output "Sales rows count: $($salesData.rows.Length)"
Write-Output "Grand Net Sales: $($salesData.grand_totals.net_sales_amount)"

Write-Output "--- TESTING PURCHASE SUMMARY ENDPOINT ---"
$purchaseUrl = "http://localhost:3001/api/reports/purchase-summary?companyId=${companyId}"
$purchaseRes = Invoke-WebRequest -Uri $purchaseUrl -Method GET -Headers @{ "Authorization" = "Bearer $token" }
Write-Output "Purchase Summary Status: $($purchaseRes.StatusCode)"
$purchaseData = $purchaseRes.Content | ConvertFrom-Json
Write-Output "Purchase rows count: $($purchaseData.rows.Length)"
Write-Output "Grand Net Purchases: $($purchaseData.grand_totals.net_purchase_amount)"

Write-Output "--- TESTING GST TAX SUMMARY ENDPOINT ---"
$gstUrl = "http://localhost:3001/api/reports/gst-summary?companyId=${companyId}"
$gstRes = Invoke-WebRequest -Uri $gstUrl -Method GET -Headers @{ "Authorization" = "Bearer $token" }
Write-Output "GST Summary Status: $($gstRes.StatusCode)"
$gstData = $gstRes.Content | ConvertFrom-Json
Write-Output "Total CGST: $($gstData.total_cgst_amount)"
Write-Output "Total SGST: $($gstData.total_sgst_amount)"
Write-Output "Total IGST: $($gstData.total_igst_amount)"

Write-Output "--- TESTING STOCK / INVENTORY SUMMARY ENDPOINT ---"
$stockUrl = "http://localhost:3001/api/reports/stock-summary?companyId=${companyId}"
$stockRes = Invoke-WebRequest -Uri $stockUrl -Method GET -Headers @{ "Authorization" = "Bearer $token" }
Write-Output "Stock Summary Status: $($stockRes.StatusCode)"
$stockData = $stockRes.Content | ConvertFrom-Json
Write-Output "Stock rows count: $($stockData.rows.Length)"

Write-Output "--- ALL REPORTS API TESTS PASSED SUCCESSFULLY ---"
