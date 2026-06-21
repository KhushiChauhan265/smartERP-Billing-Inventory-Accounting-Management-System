try {
  Invoke-RestMethod -Uri http://localhost:3001/api/auth/register -Method POST -ContentType "application/json" -Body '{"email":"unlimited@smarterp.com","password":"securepassword","fullName":"Unlimited User"}' | Out-Null
} catch {}
$tokenResponse = Invoke-RestMethod -Uri http://localhost:3001/api/auth/login -Method POST -ContentType "application/json" -Body '{"email":"unlimited@smarterp.com","password":"securepassword"}'
$token = $tokenResponse.token

Write-Output "--- TEST MAX LIMIT ---"
for ($i=1; $i -le 8; $i++) {
  try {
    $body = '{"company_name":"Unlimited Co ' + $i + '"}'
    Invoke-RestMethod -Uri http://localhost:3001/api/companies -Method POST -ContentType "application/json" -Headers @{ "Authorization" = "Bearer $token" } -Body $body | Out-Null
    Write-Output "Created company $i"
  } catch {
    Write-Output "Failed on company $i"
  }
}
$list = Invoke-RestMethod -Uri http://localhost:3001/api/companies -Method GET -Headers @{ "Authorization" = "Bearer $token" }
Write-Output "Total companies retrieved: $($list.companies.Length)"
