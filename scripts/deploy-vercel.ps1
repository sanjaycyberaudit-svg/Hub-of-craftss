# Run after: vercel login (and from project root)
# Pushes .env.local vars to Vercel, deploys production, sets SITE_URL to deployment URL.

$ErrorActionPreference = "Stop"
Set-Location $PSScriptRoot + "\.."

if (-not (Test-Path ".env.local")) {
  Write-Error ".env.local not found"
}

$env:Path = [System.Environment]::GetEnvironmentVariable("Path","Machine") + ";" + [System.Environment]::GetEnvironmentVariable("Path","User")

$lines = Get-Content ".env.local" | Where-Object { $_ -match '^\s*[^#=]+\s*=' }
foreach ($line in $lines) {
  $eq = $line.IndexOf("=")
  if ($eq -lt 1) { continue }
  $name = $line.Substring(0, $eq).Trim()
  $value = $line.Substring($eq + 1).Trim()
  if (-not $name) { continue }
  Write-Host "Setting $name ..."
  $value | vercel env add $name production --force 2>$null
  if ($LASTEXITCODE -ne 0) {
    $value | vercel env add $name production 2>$null
  }
}

Write-Host "Linking project (accept defaults if prompted)..."
vercel link --yes 2>$null
if ($LASTEXITCODE -ne 0) { vercel link }

Write-Host "Deploying to production..."
$deployUrl = (vercel deploy --prod --yes 2>&1 | Select-String -Pattern "https://\S+" | Select-Object -Last 1).ToString().Trim()
if ($deployUrl) {
  Write-Host "Deployed: $deployUrl"
  Write-Host "Updating NEXT_PUBLIC_SITE_URL..."
  $deployUrl | vercel env add NEXT_PUBLIC_SITE_URL production --force
  vercel deploy --prod --yes
}

Write-Host "Done. Add this URL in Supabase Auth -> URL Configuration (Site URL + Redirect URLs)."
