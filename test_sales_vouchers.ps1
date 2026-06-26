try {
  Invoke-RestMethod -Uri http://localhost:3001/api/auth/register -Method POST -ContentType "application/json" -Body '{"email":"sales_test@smarterp.com","password":"securepassword","fullName":"Sales Tester"}' | Out-Null
} catch {}

$tokenResponse = Invoke-RestMethod -Uri http://localhost:3001/api/auth/login -Method POST -ContentType "application/json" -Body '{"email":"sales_test@smarterp.com","password":"securepassword"}'
$token = $tokenResponse.token

Write-Output "--- CREATING COMPANY ---"
$companyBody = '{"company_name":"Sales Co"}'
$comp = Invoke-RestMethod -Uri http://localhost:3001/api/companies -Method POST -ContentType "application/json" -Headers @{ "Authorization" = "Bearer $token" } -Body $companyBody
$companyId = $comp.company.id
Write-Output "Created Company ID: $companyId"

Write-Output "--- CREATING CUSTOMER ---"
$custBody = @{
    companyId = $companyId
    name = "Acme Corp"
    code = "ACME"
    openingBalance = 2000
    openingBalanceType = "DEBIT"
} | ConvertTo-Json
$cust = Invoke-RestMethod -Uri http://localhost:3001/api/customers -Method POST -ContentType "application/json" -Headers @{ "Authorization" = "Bearer $token" } -Body $custBody
$customerId = $cust.customer.id
Write-Output "Created Customer: $($cust.customer.customer_name) (ID: $customerId)"

Write-Output "--- CREATING STOCK ITEM ---"
$itemBody = @{
    companyId = $companyId
    name = "Intel Core i9"
    sku = "CPU-I9"
    barcode = "99999"
    hsnSac = "8471"
    unitName = "PCS"
    category = "CPUs"
    purchasePrice = 30000
    sellingPrice = 35000
    openingStock = 100
    reorderLevel = 2
    gstPercentage = 18
} | ConvertTo-Json
$item = Invoke-RestMethod -Uri http://localhost:3001/api/items -Method POST -ContentType "application/json" -Headers @{ "Authorization" = "Bearer $token" } -Body $itemBody
$itemId = $item.item.id
Write-Output "Created Item: $($item.item.item_name) (ID: $itemId) - Initial Qty: $($item.item.quantity)"

Write-Output "--- CREATING SALES VOUCHER (Qty = 5) ---"
$voucherBody = @{
    companyId = $companyId
    customerId = $customerId
    voucherDate = (Get-Date).ToString("yyyy-MM-dd")
    voucherNumber = "SV-TEST-100"
    referenceNo = "INV-100"
    discountAmount = 100
    remarks = "Test Sales Voucher"
    items = @(
        @{
            itemId = $itemId
            quantity = 5
            rate = 35000
            gstRate = 18
        }
    )
} | ConvertTo-Json -Depth 5

$voucher = Invoke-RestMethod -Uri http://localhost:3001/api/sales-vouchers -Method POST -ContentType "application/json" -Headers @{ "Authorization" = "Bearer $token" } -Body $voucherBody
$voucherId = $voucher.voucher.id
Write-Output "Created Voucher: $($voucher.voucher.invoice_number) (ID: $voucherId)"
Write-Output "Voucher Totals -> Total: $($voucher.voucher.total_amount), GST: $($voucher.voucher.gst_amount), Gross: $($voucher.voucher.gross_total)"

# Verify stock is decreased by 5 (100 - 5 = 95)
$itemCheck = Invoke-RestMethod -Uri "http://localhost:3001/api/items?companyId=${companyId}&includeInactive=true" -Method GET -Headers @{ "Authorization" = "Bearer $token" }
$targetItem = $itemCheck.items | Where-Object { $_.id -eq $itemId }
Write-Output "Item stock quantity after voucher creation: $($targetItem.quantity) (Expected: 95)"

Write-Output "--- UPDATING SALES VOUCHER (Qty = 15) ---"
$updateBody = @{
    companyId = $companyId
    customerId = $customerId
    voucherDate = (Get-Date).ToString("yyyy-MM-dd")
    voucherNumber = "SV-TEST-100"
    referenceNo = "INV-100-UPD"
    discountAmount = 150
    remarks = "Updated Test Sales Voucher"
    items = @(
        @{
            itemId = $itemId
            quantity = 15
            rate = 34500
            gstRate = 18
        }
    )
} | ConvertTo-Json -Depth 5

$updatedVoucher = Invoke-RestMethod -Uri "http://localhost:3001/api/sales-vouchers/${voucherId}?companyId=${companyId}" -Method PUT -ContentType "application/json" -Headers @{ "Authorization" = "Bearer $token" } -Body $updateBody
Write-Output "Updated Voucher Totals -> Total: $($updatedVoucher.voucher.total_amount), GST: $($updatedVoucher.voucher.gst_amount), Gross: $($updatedVoucher.voucher.gross_total)"

# Verify stock is adjusted to 100 - 15 = 85
$itemCheck2 = Invoke-RestMethod -Uri "http://localhost:3001/api/items?companyId=${companyId}&includeInactive=true" -Method GET -Headers @{ "Authorization" = "Bearer $token" }
$targetItem2 = $itemCheck2.items | Where-Object { $_.id -eq $itemId }
Write-Output "Item stock quantity after update: $($targetItem2.quantity) (Expected: 85)"

Write-Output "--- CANCELLING/SOFT-DELETING SALES VOUCHER ---"
$delRes = Invoke-RestMethod -Uri "http://localhost:3001/api/sales-vouchers/${voucherId}?companyId=${companyId}" -Method DELETE -Headers @{ "Authorization" = "Bearer $token" }
Write-Output "Cancel Message: $($delRes.message)"

# Verify stock is reduced back to opening stock (100)
$itemCheck3 = Invoke-RestMethod -Uri "http://localhost:3001/api/items?companyId=${companyId}&includeInactive=true" -Method GET -Headers @{ "Authorization" = "Bearer $token" }
$targetItem3 = $itemCheck3.items | Where-Object { $_.id -eq $itemId }
Write-Output "Item stock quantity after delete/cancel: $($targetItem3.quantity) (Expected: 100)"

Write-Output "--- FETCHING VOUCHER LIST ---"
$vList = Invoke-RestMethod -Uri "http://localhost:3001/api/sales-vouchers?companyId=${companyId}" -Method GET -Headers @{ "Authorization" = "Bearer $token" }
foreach ($v in $vList.vouchers) {
    Write-Output "Voucher Number: $($v.invoice_number), Customer: $($v.customer_name), Gross Total: $($v.gross_total), Active: $($v.is_active)"
}
