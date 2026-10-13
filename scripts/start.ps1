$ErrorActionPreference = 'Stop'
$root = Split-Path -Parent $PSScriptRoot
Set-Location $root
if (-not (Test-Path '.env')) { throw 'Missing .env — copy .env.example to .env and configure it first.' }
Get-Content '.env' | ForEach-Object {
  $line = $_.Trim()
  if ($line -and -not $line.StartsWith('#') -and $line.Contains('=')) {
    $parts = $line.Split('=', 2)
    [Environment]::SetEnvironmentVariable($parts[0].Trim(), $parts[1].Trim(), 'Process')
  }
}
Write-Host 'Starting Java API on http://localhost:8080 and React on http://localhost:5173' -ForegroundColor Cyan
Start-Process powershell -ArgumentList '-NoExit','-Command', "cd '$root\backend'; mvn spring-boot:run"
Set-Location "$root\frontend"
npm run dev
