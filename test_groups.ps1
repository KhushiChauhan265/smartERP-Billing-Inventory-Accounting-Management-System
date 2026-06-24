try {
  Invoke-RestMethod -Uri http://localhost:3001/api/auth/register -Method POST -ContentType "application/json" -Body '{"email":"group_test@smarterp.com","password":"securepassword","fullName":"Group Tester"}' | Out-Null
} catch {}
$tokenResponse = Invoke-RestMethod -Uri http://localhost:3001/api/auth/login -Method POST -ContentType "application/json" -Body '{"email":"group_test@smarterp.com","password":"securepassword"}'
$token = $tokenResponse.token

Write-Output "--- CREATING COMPANY ---"
$companyBody = '{"company_name":"Groups Co 1"}'
$comp = Invoke-RestMethod -Uri http://localhost:3001/api/companies -Method POST -ContentType "application/json" -Headers @{ "Authorization" = "Bearer $token" } -Body $companyBody
$companyId = $comp.company.id
Write-Output "Created Company ID: $companyId"

Write-Output "--- CREATING GROUPS ---"
$groupBody1 = '{"companyId":"' + $companyId + '", "name":"Sundry Debtors", "code":"SDEBT01", "type":"ASSET", "isPrimary":true}'
$group1 = Invoke-RestMethod -Uri http://localhost:3001/api/groups -Method POST -ContentType "application/json" -Headers @{ "Authorization" = "Bearer $token" } -Body $groupBody1
$groupId1 = $group1.group.id
Write-Output "Created Group 1: $($group1.group.name) (ID: $groupId1)"

$groupBody2 = '{"companyId":"' + $companyId + '", "name":"Sundry Creditors", "code":"SCRED01", "type":"LIABILITY", "isPrimary":true}'
$group2 = Invoke-RestMethod -Uri http://localhost:3001/api/groups -Method POST -ContentType "application/json" -Headers @{ "Authorization" = "Bearer $token" } -Body $groupBody2
$groupId2 = $group2.group.id
Write-Output "Created Group 2: $($group2.group.name) (ID: $groupId2)"

Write-Output "--- LISTING GROUPS ---"
$list = Invoke-RestMethod -Uri "http://localhost:3001/api/groups?companyId=$companyId" -Method GET -Headers @{ "Authorization" = "Bearer $token" }
Write-Output "Found $($list.groups.Length) groups"
foreach ($g in $list.groups) {
    Write-Output "  - Group Name: $($g.name), Code: $($g.code), Type: $($g.type), Active: $($g.is_active)"
}

Write-Output "--- UPDATING GROUP ---"
$updateBody = '{"companyId":"' + $companyId + '", "name":"Sundry Debtors Updated", "code":"SDEBT01-UPD", "type":"ASSET", "isPrimary":true, "isActive":true}'
$updated = Invoke-RestMethod -Uri "http://localhost:3001/api/groups/$groupId1" -Method PUT -ContentType "application/json" -Headers @{ "Authorization" = "Bearer $token" } -Body $updateBody
Write-Output "Updated Group Name: $($updated.group.name), Code: $($updated.group.code)"

Write-Output "--- DELETING (SOFT) GROUP ---"
$deleteUrl = "http://localhost:3001/api/groups/" + $groupId1 + "?companyId=" + $companyId
Write-Output "DELETE URL: $deleteUrl"
$del = Invoke-RestMethod -Uri $deleteUrl -Method DELETE -Headers @{ "Authorization" = "Bearer $token" }
Write-Output "Deactivation Message: $($del.message)"

Write-Output "--- LISTING GROUPS AFTER DELETION ---"
$list2 = Invoke-RestMethod -Uri "http://localhost:3001/api/groups?companyId=$companyId" -Method GET -Headers @{ "Authorization" = "Bearer $token" }
foreach ($g in $list2.groups) {
    Write-Output "  - Group Name: $($g.name), Code: $($g.code), Type: $($g.type), Active: $($g.is_active)"
}
