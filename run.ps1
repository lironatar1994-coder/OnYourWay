param(
  [int]$BackendPort = 3000,
  [int]$AdminPort = 5173,
  [int]$FrontendPort = 3101,
  [switch]$SkipInstall,
  [switch]$Stop,
  [switch]$Help
)

$ErrorActionPreference = 'Stop'

$Root = Split-Path -Parent $MyInvocation.MyCommand.Path
$RuntimeDir = Join-Path $Root '.runtime'
$LogDir = Join-Path $RuntimeDir 'logs'
$PidFile = Join-Path $RuntimeDir 'run-pids.json'

function Show-Help {
  Write-Host 'On The Way local runner'
  Write-Host ''
  Write-Host 'Usage:'
  Write-Host '  .\run.ps1                 Install/setup if needed and run backend, admin, frontend'
  Write-Host '  .\run.ps1 -SkipInstall    Skip npm install checks'
  Write-Host '  .\run.ps1 -BackendPort 3002'
  Write-Host '  .\run.ps1 -Stop           Stop admin/frontend processes started by this script'
  Write-Host ''
  Write-Host 'Default URLs:'
  Write-Host '  Backend:  http://localhost:3000'
  Write-Host '  Admin:    http://localhost:5173'
  Write-Host '  Frontend: http://localhost:3101'
}

function Test-CommandExists([string]$Command) {
  return $null -ne (Get-Command $Command -ErrorAction SilentlyContinue)
}

function Test-PortAvailable([int]$Port) {
  $listener = $null
  try {
    $listener = [System.Net.Sockets.TcpListener]::new([System.Net.IPAddress]::Loopback, $Port)
    $listener.Start()
    return $true
  } catch {
    return $false
  } finally {
    if ($listener) {
      $listener.Stop()
    }
  }
}

function Get-FreePort([int]$PreferredPort) {
  $ports = if ($PreferredPort -eq 3000) {
    @($PreferredPort) + (3002..3020)
  } else {
    $PreferredPort..($PreferredPort + 20)
  }

  foreach ($port in $ports) {
    if (Test-PortAvailable $port) {
      return $port
    }
  }

  throw "No free port found near $PreferredPort."
}

function Invoke-NpmInstallIfNeeded([string]$Directory) {
  if ($SkipInstall) {
    return
  }

  $nodeModules = Join-Path $Directory 'node_modules'
  if (Test-Path -LiteralPath $nodeModules) {
    return
  }

  Write-Host "[setup] Installing dependencies in $Directory"
  Push-Location -LiteralPath $Directory
  try {
    npm.cmd install
  } finally {
    Pop-Location
  }
}

function ConvertTo-EnvAssignment([hashtable]$Environment) {
  $lines = @()
  foreach ($key in $Environment.Keys) {
    $value = [string]$Environment[$key]
    $escapedValue = $value.Replace("'", "''")
    $lines += "`$env:$key = '$escapedValue'"
  }

  return ($lines -join [Environment]::NewLine)
}

function Start-BackgroundApp(
  [string]$Name,
  [string]$Directory,
  [string]$Command,
  [hashtable]$Environment
) {
  $outLog = Join-Path $LogDir "$Name.out.log"
  $errLog = Join-Path $LogDir "$Name.err.log"
  $escapedDirectory = $Directory.Replace("'", "''")
  $escapedOutLog = $outLog.Replace("'", "''")
  $escapedErrLog = $errLog.Replace("'", "''")
  $envScript = ConvertTo-EnvAssignment $Environment

  $script = @"
`$ErrorActionPreference = 'Continue'
Set-Location -LiteralPath '$escapedDirectory'
$envScript
try {
  & {
    $Command
  } *> '$escapedOutLog'
} catch {
  `$message = `$_.Exception.ToString()
  Set-Content -LiteralPath '$escapedErrLog' -Value `$message -Encoding UTF8
  throw
}
"@

  $encoded = [Convert]::ToBase64String([Text.Encoding]::Unicode.GetBytes($script))
  $startInfo = [System.Diagnostics.ProcessStartInfo]::new()
  $startInfo.FileName = 'powershell.exe'
  $startInfo.Arguments = "-NoProfile -ExecutionPolicy Bypass -EncodedCommand $encoded"
  $startInfo.UseShellExecute = $false
  $startInfo.CreateNoWindow = $true

  $process = [System.Diagnostics.Process]::Start($startInfo)

  return [pscustomobject]@{
    name = $Name
    pid = $process.Id
    outLog = $outLog
    errLog = $errLog
  }
}

function Stop-StartedApps {
  if (!(Test-Path -LiteralPath $PidFile)) {
    Write-Host '[stop] No .runtime/run-pids.json file found.'
    return
  }

  $apps = Get-Content -LiteralPath $PidFile -Raw | ConvertFrom-Json
  foreach ($app in $apps) {
    $process = Get-Process -Id $app.pid -ErrorAction SilentlyContinue
    if ($process) {
      Write-Host "[stop] Stopping $($app.name) (PID $($app.pid))"
      taskkill.exe /PID $app.pid /T /F | Out-Null
    }
  }

  Remove-Item -LiteralPath $PidFile -Force -ErrorAction SilentlyContinue
}

if ($Help) {
  Show-Help
  exit 0
}

if ($Stop) {
  Stop-StartedApps
  exit 0
}

if (!(Test-CommandExists 'node')) {
  throw 'Node.js is required but was not found on PATH.'
}

if (!(Test-CommandExists 'npm.cmd')) {
  throw 'npm.cmd is required but was not found on PATH.'
}

New-Item -ItemType Directory -Path $RuntimeDir, $LogDir -Force | Out-Null

$BackendDir = Join-Path $Root 'backend'
$AdminDir = Join-Path $Root 'admin'
$FrontendDir = Join-Path $Root 'frontend'

foreach ($dir in @($BackendDir, $AdminDir, $FrontendDir)) {
  if (!(Test-Path -LiteralPath $dir)) {
    throw "Required directory not found: $dir"
  }
}

$ChosenBackendPort = Get-FreePort $BackendPort
if ($ChosenBackendPort -ne $BackendPort) {
  Write-Warning "Backend port $BackendPort is busy. Using $ChosenBackendPort for this run."
}

if (!(Test-PortAvailable $AdminPort)) {
  throw "Admin port $AdminPort is already in use. Stop that process or pass -AdminPort with a free port."
}

if (!(Test-PortAvailable $FrontendPort)) {
  throw "Frontend port $FrontendPort is already in use. Stop that process or pass -FrontendPort with a free port."
}

Invoke-NpmInstallIfNeeded $BackendDir
Invoke-NpmInstallIfNeeded $AdminDir
Invoke-NpmInstallIfNeeded $FrontendDir

Write-Host '[setup] Preparing SQLite database'
Push-Location -LiteralPath $BackendDir
try {
  npm.cmd run db:setup
} finally {
  Pop-Location
}

$BackendUrl = "http://localhost:$ChosenBackendPort"
$AdminUrl = "http://localhost:$AdminPort"
$FrontendUrl = "http://localhost:$FrontendPort"

$started = @()

try {
  Write-Host "[run] Starting Admin CRM at $AdminUrl"
  $started += Start-BackgroundApp `
    -Name 'admin' `
    -Directory $AdminDir `
    -Command "npm.cmd run dev -- --host 127.0.0.1 --port $AdminPort" `
    -Environment @{ VITE_API_URL = $BackendUrl }

  Write-Host "[run] Starting public frontend at $FrontendUrl"
  $frontendCommand = if ($FrontendPort -eq 3101) {
    'npm.cmd run dev'
  } else {
    "npx.cmd next dev -p $FrontendPort"
  }

  $started += Start-BackgroundApp `
    -Name 'frontend' `
    -Directory $FrontendDir `
    -Command $frontendCommand `
    -Environment @{ BACKEND_URL = $BackendUrl }

  $started | ConvertTo-Json -Depth 4 | Set-Content -LiteralPath $PidFile -Encoding UTF8

  Write-Host ''
  Write-Host '[run] System URLs'
  Write-Host "  Backend:  $BackendUrl"
  Write-Host "  Admin:    $AdminUrl"
  Write-Host "  Frontend: $FrontendUrl"
  Write-Host ''
  Write-Host '[run] Background logs'
  Write-Host "  Admin:    $LogDir\admin.out.log"
  Write-Host "  Frontend: $LogDir\frontend.out.log"
  Write-Host ''
  Write-Host '[run] Backend will run in this terminal so the WhatsApp QR remains visible.'
  Write-Host '[run] Press Ctrl+C to stop the backend. Run .\run.ps1 -Stop to stop admin/frontend.'
  Write-Host ''

  Push-Location -LiteralPath $BackendDir
  try {
    $env:PORT = [string]$ChosenBackendPort
    npm.cmd start
  } finally {
    Pop-Location
  }
} finally {
  if ($started.Count -gt 0) {
    Write-Host ''
    Write-Host '[run] Admin/frontend may still be running in the background.'
    Write-Host '[run] Use .\run.ps1 -Stop to stop processes started by this script.'
  }
}
