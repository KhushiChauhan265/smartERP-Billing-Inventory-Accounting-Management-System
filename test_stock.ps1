try {
  Invoke-RestMethod -Uri http://localhost:3001/api/auth/register -Method POST -ContentType "application/json" -Body '{"email":"stock_test@smarterp.com","password":"securepassword","fullName":"Stock Tester"}' | Out-Null
} catch {}
$tokenResponse = Invoke-RestMethod -Uri http://localhost:3001/api/auth/login -Method POST -ContentType "application/json" -Body '{"email":"stock_test@smarterp.com","password":"securepassword"}'
$token = $tokenResponse.token

Write-Output "--- CREATING COMPANY ---"
$companyBody = '{"company_name":"Stock Co 1"}'
$comp = Invoke-RestMethod -Uri http://localhost:3001/api/companies -Method POST -ContentType "application/json" -Headers @{ "Authorization" = "Bearer $token" } -Body $companyBody
$companyId = $comp.company.id
Write-Output "Created Company ID: $companyId"

Write-Output "--- CREATING STOCK ITEMS ---"
$itemBody1 = '{"companyId":"' + $companyId + '", "name":"Intel Core i7", "sku":"CPU-I7", "barcode":"11111", "hsnSac":"8471", "unitName":"PCS", "category":"CPUs", "purchasePrice":25000, "sellingPrice":30000, "openingStock":15, "reorderLevel":3, "gstPercentage":18}'
$item1 = Invoke-RestMethod -Uri http://localhost:3001/api/items -Method POST -ContentType "application/json" -Headers @{ "Authorization" = "Bearer $token" } -Body $itemBody1
$itemId1 = $item1.item.id
Write-Output "Created Item 1: $($item1.item.item_name) (ID: $itemId1) with qty $($item1.item.quantity)"

$itemBody2 = '{"companyId":"' + $companyId + '", "name":"ASUS ROG Motherboard", "sku":"MB-ROG", "barcode":"22222", "hsnSac":"8473", "unitName":"PCS", "category":"Motherboards", "purchasePrice":15000, "sellingPrice":18000, "openingStock":5, "reorderLevel":2, "gstPercentage":18}'
$item2 = Invoke-RestMethod -Uri http://localhost:3001/api/items -Method POST -ContentType "application/json" -Headers @{ "Authorization" = "Bearer $token" } -Body $itemBody2
$itemId2 = $item2.item.id
Write-Output "Created Item 2: $($item2.item.item_name) (ID: $itemId2) with qty $($item2.item.quantity)"

Write-Output "--- LISTING ITEMS ---"
$list = Invoke-RestMethod -Uri "http://localhost:3001/api/items?companyId=$companyId" -Method GET -Headers @{ "Authorization" = "Bearer $token" }
Write-Output "Found $($list.items.Length) items"
foreach ($it in $list.items) {
    Write-Output "  - Name: $($it.item_name), SKU: $($it.sku), Stock Qty: $($it.quantity), Active: $($it.is_active)"
}

Write-Output "--- UPDATING ITEM ---"
$updateBody = '{"companyId":"' + $companyId + '", "name":"Intel Core i7 Gen 13", "sku":"CPU-I7-G13", "barcode":"11111", "hsnSac":"8471", "unitName":"PCS", "category":"CPUs", "purchasePrice":26000, "sellingPrice":31000, "openingStock":20, "reorderLevel":4, "gstPercentage":18, "isActive":true}'
$updated = Invoke-RestMethod -Uri "http://localhost:3001/api/items/$itemId1" -Method PUT -ContentType "application/json" -Headers @{ "Authorization" = "Bearer $token" } -Body $updateBody
Write-Output "Updated Item Name: $($updated.item.item_name), SKU: $($updated.item.sku), New Qty: $($updated.item.quantity)"

Write-Output "--- DELETING (SOFT) ITEM ---"
$deleteUrl = "http://localhost:3001/api/items/" + $itemId2 + "?companyId=" + $companyId
Write-Output "DELETE URL: $deleteUrl"
$del = Invoke-RestMethod -Uri $deleteUrl -Method DELETE -Headers @{ "Authorization" = "Bearer $token" }
Write-Output "Deactivation Message: $($del.message)"

Write-Output "--- LISTING ITEMS AFTER DELETION ---"
$list2 = Invoke-RestMethod -Uri "http://localhost:3001/api/items?companyId=$companyId" -Method GET -Headers @{ "Authorization" = "Bearer $token" }
foreach ($it in $list2.items) {
    Write-Output "  - Name: $($it.item_name), SKU: $($it.sku), Stock Qty: $($it.quantity), Active: $($it.is_active)"
}

Write-Output "--- LISTING ITEMS WITH INACTIVE INCLUDED ---"
$list3 = Invoke-RestMethod -Uri "http://localhost:3001/api/items?companyId=$companyId&includeInactive=true" -Method GET -Headers @{ "Authorization" = "Bearer $token" }
foreach ($it in $list3.items) {
    Write-Output "  - Name: $($it.item_name), SKU: $($it.sku), Stock Qty: $($it.quantity), Active: $($it.is_active)"
}
