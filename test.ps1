try {
  Invoke-RestMethod -Uri http://localhost:3001/api/auth/register -Method POST -ContentType "application/json" -Body '{"email":"admin@smarterp.com","password":"securepassword","fullName":"Admin User"}' | Out-Null
} catch {}
$tokenResponse = Invoke-RestMethod -Uri http://localhost:3001/api/auth/login -Method POST -ContentType "application/json" -Body '{"email":"admin@smarterp.com","password":"securepassword"}'
$token = $tokenResponse.token
Write-Output "--- LOGIN ---"
$tokenResponse | ConvertTo-Json

Write-Output "--- COMPANIES BEFORE ---"
$companiesBefore = Invoke-RestMethod -Uri http://localhost:3001/api/companies -Method GET -Headers @{ "Authorization" = "Bearer $token" }
$companiesBefore | ConvertTo-Json -Depth 5

Write-Output "--- CREATE COMPANY ---"
$newCompanyBody = '{"company_name":"Test Co 1","address":"Test Address","gst_number":"GST123","state":"UP","financial_year_start":"2024-04-01","financial_year_end":"2025-03-31","contact_number":"9999999999"}'
$createdCompany = Invoke-RestMethod -Uri http://localhost:3001/api/companies -Method POST -ContentType "application/json" -Headers @{ "Authorization" = "Bearer $token" } -Body $newCompanyBody
$createdCompany | ConvertTo-Json -Depth 5
$companyId = $createdCompany.company.id

Write-Output "--- UPDATE COMPANY ---"
$updateBody = '{"company_name":"Test Co 1 Updated","address":"New Address","gst_number":"GST123","state":"UP","financial_year_start":"2024-04-01","financial_year_end":"2025-03-31","contact_number":"8888888888"}'
$updatedCompany = Invoke-RestMethod -Uri "http://localhost:3001/api/companies/$companyId" -Method PUT -ContentType "application/json" -Headers @{ "Authorization" = "Bearer $token" } -Body $updateBody
$updatedCompany | ConvertTo-Json -Depth 5

Write-Output "--- DELETE COMPANY ---"
$deleteResponse = Invoke-RestMethod -Uri "http://localhost:3001/api/companies/$companyId" -Method DELETE -Headers @{ "Authorization" = "Bearer $token" }
$deleteResponse | ConvertTo-Json -Depth 5

Write-Output "--- TEST MAX 5 ---"
for ($i=1; $i -le 5; $i++) {
  try {
    $body = '{"company_name":"Fill Co ' + $i + '"}'
    Invoke-RestMethod -Uri http://localhost:3001/api/companies -Method POST -ContentType "application/json" -Headers @{ "Authorization" = "Bearer $token" } -Body $body | Out-Null
  } catch {}
}
try {
  $body = '{"company_name":"Error Co"}'
  Invoke-RestMethod -Uri http://localhost:3001/api/companies -Method POST -ContentType "application/json" -Headers @{ "Authorization" = "Bearer $token" } -Body $body | Out-Null
} catch {
  Write-Output $_.Exception.Response.StatusCode.value__
  $stream = $_.Exception.Response.GetResponseStream()
  $reader = New-Object System.IO.StreamReader($stream)
  $reader.ReadToEnd()
}
