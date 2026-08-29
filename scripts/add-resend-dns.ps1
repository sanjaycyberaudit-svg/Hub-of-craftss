# Add Resend DNS for hubsofcraftss.com (run with CF_API_TOKEN from Shaaru Cloudflare account)
# Required: Zone.DNS Edit permission for hubsofcraftss.com

$ErrorActionPreference = 'Stop'
$token = $env:CF_API_TOKEN
if (-not $token) { throw 'Set CF_API_TOKEN first (Cloudflare API token with Zone DNS Edit)' }

$headers = @{ Authorization = \"Bearer $token\"; 'Content-Type' = 'application/json' }
$zone = Invoke-RestMethod -Headers $headers -Uri 'https://api.cloudflare.com/client/v4/zones?name=hubsofcraftss.com'
$zoneId = $zone.result[0].id
if (-not $zoneId) { throw 'Zone hubsofcraftss.com not found for this token' }
Write-Host \"zone=$zoneId\"

$records = @(
  @{ type='TXT'; name='resend._domainkey'; content='p=MIGfMA0GCSqGSIb3DQEBAQUAA4GNADCBiQKBgQC+A6ytWBuKcz75rhZxhKXOxsO6RLWK8d/XQBWfldfQZPiN+sgWPijzxBYf1odf1aqk5C6V38bChY4KLcJvqAveBveNL+hiWRXgtHbrs7YEJ0pcLMtXDVBmavrQJZiVuSrV9HOBi3s4+yMiJdkIx76RkIU+uy+TaRRH+U43buZ/SwIDAQAB'; },
  @{ type='MX'; name='send'; content='feedback-smtp.us-east-1.amazonses.com'; priority=10 },
  @{ type='TXT'; name='send'; content='v=spf1 include:amazonses.com ~all' }
)

foreach ($r in $records) {
  $body = @{
    type = $r.type
    name = $r.name
    content = $r.content
    ttl = 3600
    proxied = $false
  }
  if ($r.priority) { $body.priority = $r.priority }
  $json = $body | ConvertTo-Json
  try {
    $res = Invoke-RestMethod -Method Post -Headers $headers -Uri \"https://api.cloudflare.com/client/v4/zones/$zoneId/dns_records\" -Body $json
    Write-Host \"OK $($r.type) $($r.name) => $($res.result.id)\"
  } catch {
    Write-Host \"FAIL $($r.type) $($r.name): $($_.Exception.Message)\"
    if ($_.ErrorDetails.Message) { Write-Host $_.ErrorDetails.Message }
  }
}
