try {
  Invoke-RestMethod -Uri http://localhost:3001/api/auth/register -Method POST -ContentType "application/json" -Body '{"email":"voucher_test@smarterp.com","password":"securepassword","fullName":"Voucher Tester"}' | Out-Null
} catch {}

$tokenResponse = Invoke-RestMethod -Uri http://localhost:3001/api/auth/login -Method POST -ContentType "application/json" -Body '{"email":"voucher_test@smarterp.com","password":"securepassword"}'
$token = $tokenResponse.token

Write-Output "--- CREATING COMPANY ---"
$companyBody = '{"company_name":"Voucher Co"}'
$comp = Invoke-RestMethod -Uri http://localhost:3001/api/companies -Method POST -ContentType "application/json" -Headers @{ "Authorization" = "Bearer $token" } -Body $companyBody
$companyId = $comp.company.id
Write-Output "Created Company ID: $companyId"

Write-Output "--- CREATING SUPPLIER ---"
$supBody = @{
    companyId = $companyId
    name = "Stark Industries"
    code = "STARK"
    openingBalance = 5000
    openingBalanceType = "CREDIT"
} | ConvertTo-Json
$sup = Invoke-RestMethod -Uri http://localhost:3001/api/suppliers -Method POST -ContentType "application/json" -Headers @{ "Authorization" = "Bearer $token" } -Body $supBody
$supplierId = $sup.supplier.id
Write-Output "Created Supplier: $($sup.supplier.supplier_name) (ID: $supplierId)"

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
    openingStock = 10
    reorderLevel = 2
    gstPercentage = 18
} | ConvertTo-Json
$item = Invoke-RestMethod -Uri http://localhost:3001/api/items -Method POST -ContentType "application/json" -Headers @{ "Authorization" = "Bearer $token" } -Body $itemBody
$itemId = $item.item.id
Write-Output "Created Item: $($item.item.item_name) (ID: $itemId) - Initial Qty: $($item.item.quantity)"

Write-Output "--- CREATING PURCHASE VOUCHER (Qty = 5) ---"
$voucherBody = @{
    companyId = $companyId
    supplierId = $supplierId
    voucherDate = (Get-Date).ToString("yyyy-MM-dd")
    voucherNumber = "PV-TEST-100"
    discountAmount = 100
    remarks = "Test Purchase Voucher"
    items = @(
        @{
            itemId = $itemId
            quantity = 5
            rate = 28000
            gstRate = 18
        }
    )
} | ConvertTo-Json -Depth 5

$voucher = Invoke-RestMethod -Uri http://localhost:3001/api/purchase-vouchers -Method POST -ContentType "application/json" -Headers @{ "Authorization" = "Bearer $token" } -Body $voucherBody
$voucherId = $voucher.voucher.id
Write-Output "Created Voucher: $($voucher.voucher.voucher_number) (ID: $voucherId)"
Write-Output "Voucher Totals -> Total: $($voucher.voucher.total_amount), GST: $($voucher.voucher.gst_amount), Gross: $($voucher.voucher.gross_total)"

# Verify stock is increased by 5 (10 + 5 = 15)
$itemCheck = Invoke-RestMethod -Uri "http://localhost:3001/api/items?companyId=$companyId&includeInactive=true" -Method GET -Headers @{ "Authorization" = "Bearer $token" }
$targetItem = $itemCheck.items | Where-Object { $_.id -eq $itemId }
Write-Output "Item stock quantity after voucher creation: $($targetItem.quantity) (Expected: 15)"

Write-Output "--- UPDATING PURCHASE VOUCHER (Qty = 15) ---"
$updateBody = @{
    companyId = $companyId
    supplierId = $supplierId
    voucherDate = (Get-Date).ToString("yyyy-MM-dd")
    voucherNumber = "PV-TEST-100"
    discountAmount = 150
    remarks = "Updated Test Purchase Voucher"
    items = @(
        @{
            itemId = $itemId
            quantity = 15
            rate = 27500
            gstRate = 18
        }
    )
} | ConvertTo-Json -Depth 5

Write-Output "PUT URL: http://localhost:3001/api/purchase-vouchers/${voucherId}?companyId=${companyId}"
$updatedVoucher = Invoke-RestMethod -Uri "http://localhost:3001/api/purchase-vouchers/${voucherId}?companyId=${companyId}" -Method PUT -ContentType "application/json" -Headers @{ "Authorization" = "Bearer $token" } -Body $updateBody
Write-Output "Updated Voucher Totals -> Total: $($updatedVoucher.voucher.total_amount), GST: $($updatedVoucher.voucher.gst_amount), Gross: $($updatedVoucher.voucher.gross_total)"

# Verify stock is adjusted to 10 + 15 = 25
$itemCheck2 = Invoke-RestMethod -Uri "http://localhost:3001/api/items?companyId=${companyId}&includeInactive=true" -Method GET -Headers @{ "Authorization" = "Bearer $token" }
$targetItem2 = $itemCheck2.items | Where-Object { $_.id -eq $itemId }
Write-Output "Item stock quantity after update: $($targetItem2.quantity) (Expected: 25)"

Write-Output "--- CANCELLING/SOFT-DELETING PURCHASE VOUCHER ---"
Write-Output "DELETE URL: http://localhost:3001/api/purchase-vouchers/${voucherId}?companyId=${companyId}"
$delRes = Invoke-RestMethod -Uri "http://localhost:3001/api/purchase-vouchers/${voucherId}?companyId=${companyId}" -Method DELETE -Headers @{ "Authorization" = "Bearer $token" }
Write-Output "Cancel Message: $($delRes.message)"

# Verify stock is reduced back to opening stock (10)
$itemCheck3 = Invoke-RestMethod -Uri "http://localhost:3001/api/items?companyId=$companyId&includeInactive=true" -Method GET -Headers @{ "Authorization" = "Bearer $token" }
$targetItem3 = $itemCheck3.items | Where-Object { $_.id -eq $itemId }
Write-Output "Item stock quantity after delete/cancel: $($targetItem3.quantity) (Expected: 10)"

Write-Output "--- FETCHING VOUCHER LIST ---"
$vList = Invoke-RestMethod -Uri "http://localhost:3001/api/purchase-vouchers?companyId=$companyId" -Method GET -Headers @{ "Authorization" = "Bearer $token" }
foreach ($v in $vList.vouchers) {
    Write-Output "Voucher Number: $($v.voucher_number), Supplier: $($v.supplier_name), Gross Total: $($v.gross_total), Active: $($v.is_active)"
}
