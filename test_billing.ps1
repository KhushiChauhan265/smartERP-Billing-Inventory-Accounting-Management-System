try {
  Invoke-RestMethod -Uri http://localhost:3001/api/auth/register -Method POST -ContentType "application/json" -Body '{"email":"billing_test@smarterp.com","password":"securepassword","fullName":"Billing Tester"}' | Out-Null
} catch {}

$tokenResponse = Invoke-RestMethod -Uri http://localhost:3001/api/auth/login -Method POST -ContentType "application/json" -Body '{"email":"billing_test@smarterp.com","password":"securepassword"}'
$token = $tokenResponse.token

Write-Output "--- CREATING COMPANY ---"
$companyBody = '{"company_name":"Billing Co"}'
$comp = Invoke-RestMethod -Uri http://localhost:3001/api/companies -Method POST -ContentType "application/json" -Headers @{ "Authorization" = "Bearer $token" } -Body $companyBody
$companyId = $comp.company.id
Write-Output "Created Company ID: $companyId"

Write-Output "--- CREATING CUSTOMER & SUPPLIER ---"
$custBody = @{
    companyId = $companyId
    name = "Billing Customer Ltd"
    code = "BCL"
    openingBalance = 1500
    openingBalanceType = "DEBIT"
} | ConvertTo-Json
$cust = Invoke-RestMethod -Uri http://localhost:3001/api/customers -Method POST -ContentType "application/json" -Headers @{ "Authorization" = "Bearer $token" } -Body $custBody
$customerId = $cust.customer.id
Write-Output "Created Customer: $($cust.customer.customer_name) (ID: $customerId)"

$supBody = @{
    companyId = $companyId
    name = "Billing Supplier Ltd"
    code = "BSL"
    openingBalance = 3000
    openingBalanceType = "CREDIT"
} | ConvertTo-Json
$sup = Invoke-RestMethod -Uri http://localhost:3001/api/suppliers -Method POST -ContentType "application/json" -Headers @{ "Authorization" = "Bearer $token" } -Body $supBody
$supplierId = $sup.supplier.id
Write-Output "Created Supplier: $($sup.supplier.supplier_name) (ID: $supplierId)"

Write-Output "--- CREATING STOCK ITEM ---"
$itemBody = @{
    companyId = $companyId
    name = "Processor Intel Core i7"
    sku = "CPU-I7-1"
    barcode = "11111"
    hsnSac = "8471"
    unitName = "PCS"
    category = "CPUs"
    purchasePrice = 20000
    sellingPrice = 25000
    openingStock = 50
    reorderLevel = 2
    gstPercentage = 18
} | ConvertTo-Json
$item = Invoke-RestMethod -Uri http://localhost:3001/api/items -Method POST -ContentType "application/json" -Headers @{ "Authorization" = "Bearer $token" } -Body $itemBody
$itemId = $item.item.id
Write-Output "Created Item: $($item.item.item_name) (ID: $itemId)"

Write-Output "--- CREATING SALES VOUCHER (Qty = 2) ---"
$sVoucherBody = @{
    companyId = $companyId
    customerId = $customerId
    voucherDate = (Get-Date).ToString("yyyy-MM-dd")
    voucherNumber = "SV-BILLING-1"
    referenceNo = "REF-SV1"
    discountAmount = 100
    remarks = "Billing Sales Check"
    items = @(
        @{
            itemId = $itemId
            quantity = 2
            rate = 25000
            gstRate = 18
        }
    )
} | ConvertTo-Json -Depth 5
$sVoucher = Invoke-RestMethod -Uri http://localhost:3001/api/sales-vouchers -Method POST -ContentType "application/json" -Headers @{ "Authorization" = "Bearer $token" } -Body $sVoucherBody
$salesId = $sVoucher.voucher.id
Write-Output "Created Sales Voucher: $($sVoucher.voucher.invoice_number) (ID: $salesId) with total: $($sVoucher.voucher.gross_total)"

Write-Output "--- CREATING PURCHASE VOUCHER (Qty = 10) ---"
$pVoucherBody = @{
    companyId = $companyId
    supplierId = $supplierId
    voucherDate = (Get-Date).ToString("yyyy-MM-dd")
    voucherNumber = "PV-BILLING-1"
    discountAmount = 200
    remarks = "Billing Purchase Check"
    items = @(
        @{
            itemId = $itemId
            quantity = 10
            rate = 20000
            gstRate = 18
        }
    )
} | ConvertTo-Json -Depth 5
$pVoucher = Invoke-RestMethod -Uri http://localhost:3001/api/purchase-vouchers -Method POST -ContentType "application/json" -Headers @{ "Authorization" = "Bearer $token" } -Body $pVoucherBody
$purchaseId = $pVoucher.voucher.id
Write-Output "Created Purchase Voucher: $($pVoucher.voucher.voucher_number) (ID: $purchaseId) with total: $($pVoucher.voucher.gross_total)"

Write-Output "--- TESTING GET /api/billing/sales ---"
$salesList = Invoke-RestMethod -Uri "http://localhost:3001/api/billing/sales?companyId=${companyId}" -Method GET -Headers @{ "Authorization" = "Bearer $token" }
Write-Output "Found $($salesList.vouchers.Length) sales vouchers in billing."
foreach ($v in $salesList.vouchers) {
    Write-Output "  - No: $($v.invoice_number), Customer: $($v.customer_name), Gross Total: $($v.gross_total), Active: $($v.is_active)"
}

Write-Output "--- TESTING GET /api/billing/purchase ---"
$purchaseList = Invoke-RestMethod -Uri "http://localhost:3001/api/billing/purchase?companyId=${companyId}" -Method GET -Headers @{ "Authorization" = "Bearer $token" }
Write-Output "Found $($purchaseList.vouchers.Length) purchase vouchers in billing."
foreach ($v in $purchaseList.vouchers) {
    Write-Output "  - No: $($v.voucher_number), Supplier: $($v.supplier_name), Gross Total: $($v.gross_total), Active: $($v.is_active)"
}

Write-Output "--- TESTING FILTERS ---"
# Date range filtering
$todayStr = (Get-Date).ToString("yyyy-MM-dd")
$salesFiltered = Invoke-RestMethod -Uri "http://localhost:3001/api/billing/sales?companyId=${companyId}&fromDate=${todayStr}&toDate=${todayStr}" -Method GET -Headers @{ "Authorization" = "Bearer $token" }
Write-Output "Filtered by Date: Found $($salesFiltered.vouchers.Length) sales vouchers."

# Customer filtering
$salesCustFiltered = Invoke-RestMethod -Uri "http://localhost:3001/api/billing/sales?companyId=${companyId}&customerId=${customerId}" -Method GET -Headers @{ "Authorization" = "Bearer $token" }
Write-Output "Filtered by Customer: Found $($salesCustFiltered.vouchers.Length) sales vouchers."

# Status filtering
$salesStatusFiltered = Invoke-RestMethod -Uri "http://localhost:3001/api/billing/sales?companyId=${companyId}&status=active" -Method GET -Headers @{ "Authorization" = "Bearer $token" }
Write-Output "Filtered by Status (Active): Found $($salesStatusFiltered.vouchers.Length) sales vouchers."

Write-Output "--- TESTING GET DETAILS BY ID ---"
$salesDetails = Invoke-RestMethod -Uri "http://localhost:3001/api/billing/sales/${salesId}?companyId=${companyId}" -Method GET -Headers @{ "Authorization" = "Bearer $token" }
Write-Output "Details resolved: No: $($salesDetails.voucher.invoice_number), Customer: $($salesDetails.voucher.customer_name), Item count: $($salesDetails.items.Length)"

$purchaseDetails = Invoke-RestMethod -Uri "http://localhost:3001/api/billing/purchase/${purchaseId}?companyId=${companyId}" -Method GET -Headers @{ "Authorization" = "Bearer $token" }
Write-Output "Details resolved: No: $($purchaseDetails.voucher.voucher_number), Supplier: $($purchaseDetails.voucher.supplier_name), Item count: $($purchaseDetails.items.Length)"

Write-Output "--- TESTING PDF ENDPOINTS ---"
# Call Sales PDF Endpoint
$salesPdfUrl = "http://localhost:3001/api/billing/sales/${salesId}/pdf?companyId=${companyId}"
$salesPdfRes = Invoke-WebRequest -Uri $salesPdfUrl -Method GET -Headers @{ "Authorization" = "Bearer $token" }
Write-Output "Sales PDF Status Code: $($salesPdfRes.StatusCode)"
Write-Output "Sales PDF Content-Type: $($salesPdfRes.Headers['Content-Type'])"
Write-Output "Sales PDF Content-Disposition: $($salesPdfRes.Headers['Content-Disposition'])"

# Call Purchase PDF Endpoint
$purchasePdfUrl = "http://localhost:3001/api/billing/purchase/${purchaseId}/pdf?companyId=${companyId}"
$purchasePdfRes = Invoke-WebRequest -Uri $purchasePdfUrl -Method GET -Headers @{ "Authorization" = "Bearer $token" }
Write-Output "Purchase PDF Status Code: $($purchasePdfRes.StatusCode)"
Write-Output "Purchase PDF Content-Type: $($purchasePdfRes.Headers['Content-Type'])"
Write-Output "Purchase PDF Content-Disposition: $($purchasePdfRes.Headers['Content-Disposition'])"
