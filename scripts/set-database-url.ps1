# Sets DATABASE_URL in .env.local (official HiyoRi Way A)
$envPath = Join-Path $PSScriptRoot "..\.env.local"
if (-not (Test-Path $envPath)) {
    Write-Host "Missing .env.local" -ForegroundColor Red
    exit 1
}

Write-Host ""
Write-Host "=== Supabase DATABASE_URL (Way A) ===" -ForegroundColor Cyan
Write-Host ""
Write-Host "1. Open: https://supabase.com/dashboard/project/qhtwwyqlsnckorndmhmt/settings/database"
Write-Host "2. Connection string -> URI"
Write-Host "3. Mode: Transaction (pooler) recommended"
Write-Host "4. Copy the full URI and replace [YOUR-PASSWORD] with your DB password"
Write-Host ""
Write-Host "Choose:" -ForegroundColor Yellow
Write-Host "  [1] Paste FULL connection URI (recommended)"
Write-Host "  [2] Paste password only (uses default pooler host)"
Write-Host ""

$choice = Read-Host "Enter 1 or 2"
$url = ""

if ($choice -eq "1") {
    $url = Read-Host "Paste full postgresql://... URI"
} else {
    $password = Read-Host "Paste database password" -AsSecureString
    $plain = [Runtime.InteropServices.Marshal]::PtrToStringAuto(
        [Runtime.InteropServices.Marshal]::SecureStringToBSTR($password)
    )
    $encoded = [uri]::EscapeDataString($plain)
    $url = "postgresql://postgres.qhtwwyqlsnckorndmhmt:${encoded}@aws-1-ap-south-1.pooler.supabase.com:6543/postgres"
}

if (-not $url.StartsWith("postgresql://")) {
    Write-Host "Invalid URI. Must start with postgresql://" -ForegroundColor Red
    exit 1
}

$content = Get-Content $envPath -Raw
if ($content -match 'DATABASE_URL=.*') {
    $content = $content -replace 'DATABASE_URL=.*', "DATABASE_URL=$url"
} else {
    $content += "`nDATABASE_URL=$url`n"
}
Set-Content -Path $envPath -Value $content.TrimEnd()

Write-Host ""
Write-Host "Saved DATABASE_URL to .env.local" -ForegroundColor Green
Write-Host ""
Write-Host "Run now:" -ForegroundColor Cyan
Write-Host '  cd "e:\Sakthi textiles\HiyoRi-Ecommerce-Nextjs-Supabase"'
Write-Host "  npm run db:setup"
