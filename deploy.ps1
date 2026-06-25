# ==============================================================================
# On Your Way Deployment Script (Local Windows)
# Based on the existing ServerMonitor/Vee deployment flow.
# ==============================================================================

param (
    [string]$CommitMessage = "Deploy On Your Way",
    [switch]$SkipCheck,
    [switch]$NoDirectFallback
)

$ErrorActionPreference = "Stop"

$SSH_HOST = "root@vee-app.co.il"
$SSH_DOMAIN = "vee-app.co.il"
$REMOTE_REPO = "https://github.com/lironatar1994-coder/On-Your-Way.git"
$REMOTE_DIR = "/root/On-Your-Way"
$ARCHIVE_NAME = "on-your-way-deploy.zip"

Write-Host "--- Starting On Your Way Deployment ---" -ForegroundColor Cyan

if (-not $SkipCheck) {
    Write-Host "Checking server connectivity..." -ForegroundColor Gray
    if (-not (Test-Connection -ComputerName $SSH_DOMAIN -Count 1 -Quiet)) {
        Write-Host "Error: Could not ping server $SSH_DOMAIN." -ForegroundColor Red
        exit 1
    }
}

if (-not (Test-Path ".git")) {
    Write-Host "Initializing local git repository..." -ForegroundColor Yellow
    git init
}

$currentRemote = ""
try {
    $currentRemote = git remote get-url origin
} catch {
    $currentRemote = ""
}

if (-not $currentRemote) {
    Write-Host "Adding origin $REMOTE_REPO" -ForegroundColor Yellow
    git remote add origin $REMOTE_REPO
} elseif ($currentRemote -ne $REMOTE_REPO) {
    Write-Host "Setting origin to $REMOTE_REPO" -ForegroundColor Yellow
    git remote set-url origin $REMOTE_REPO
}

$branch = git branch --show-current
if (-not $branch) {
    git checkout -b main
} elseif ($branch -ne "main") {
    Write-Host "Renaming deployment branch to main..." -ForegroundColor Yellow
    git branch -M main
}

$status = git status --porcelain
if ($status) {
    if (-not $CommitMessage) {
        $CommitMessage = Read-Host "Changes detected. Enter commit message"
    }
    if (-not $CommitMessage) {
        Write-Host "Error: Commit message required." -ForegroundColor Red
        exit 1
    }

    Write-Host "Staging and committing project files..." -ForegroundColor Gray
    git add .
    git commit -m "$CommitMessage"
} else {
    Write-Host "No local changes to commit. Proceeding with deploy." -ForegroundColor Yellow
}

Write-Host "Checking GitHub repository $REMOTE_REPO..." -ForegroundColor Gray
git ls-remote $REMOTE_REPO HEAD *> $null
$remoteExists = ($LASTEXITCODE -eq 0)

if ($remoteExists) {
    Write-Host "Pushing to GitHub..." -ForegroundColor Gray
    git push -u origin main
    if ($LASTEXITCODE -ne 0) {
        Write-Host "Error: Git push failed." -ForegroundColor Red
        exit $LASTEXITCODE
    }

    Write-Host "Connecting to server and triggering git-based remote deploy..." -ForegroundColor Blue
    $REMOTE_CMD = "if [ ! -d $REMOTE_DIR/.git ]; then git clone $REMOTE_REPO $REMOTE_DIR; fi && cd $REMOTE_DIR && git remote set-url origin $REMOTE_REPO && git fetch origin main && git reset --hard origin/main && chmod +x deploy_linux.sh && ./deploy_linux.sh"
    ssh $SSH_HOST $REMOTE_CMD
} else {
    if ($NoDirectFallback) {
        Write-Host "Error: GitHub repository does not exist: $REMOTE_REPO" -ForegroundColor Red
        Write-Host "Create it on GitHub or rerun without -NoDirectFallback to deploy by archive sync." -ForegroundColor Yellow
        exit 1
    }

    Write-Host "GitHub repository does not exist yet. Deploying by direct archive sync." -ForegroundColor Yellow
    $archivePath = Join-Path $env:TEMP $ARCHIVE_NAME
    if (Test-Path $archivePath) {
        Remove-Item -LiteralPath $archivePath -Force
    }

    git archive --format=zip -o $archivePath HEAD
    if ($LASTEXITCODE -ne 0) {
        Write-Host "Error: Failed to create deployment archive." -ForegroundColor Red
        exit $LASTEXITCODE
    }

    scp $archivePath "${SSH_HOST}:/tmp/$ARCHIVE_NAME"
    if ($LASTEXITCODE -ne 0) {
        Write-Host "Error: Failed to copy deployment archive to server." -ForegroundColor Red
        exit $LASTEXITCODE
    }

    $REMOTE_CMD = "mkdir -p $REMOTE_DIR && cd $REMOTE_DIR && unzip -oq /tmp/$ARCHIVE_NAME && chmod +x deploy_linux.sh && SKIP_GIT_SYNC=1 ./deploy_linux.sh"
    ssh $SSH_HOST $REMOTE_CMD
}

if ($LASTEXITCODE -ne 0) {
    Write-Host "`n[!] DEPLOYMENT FAILED" -ForegroundColor Red
    Write-Host "The remote script exited with error code $LASTEXITCODE." -ForegroundColor Yellow
    exit $LASTEXITCODE
}

Write-Host "`n================================================" -ForegroundColor Green
Write-Host "      ON YOUR WAY DEPLOYED SUCCESSFULLY" -ForegroundColor Green
Write-Host "================================================" -ForegroundColor Green
Write-Host "Public: http://on-your-way.vee-app.co.il" -ForegroundColor Cyan
Write-Host "Admin:  http://admin.on-your-way.vee-app.co.il" -ForegroundColor Cyan
Write-Host "GitHub target: $REMOTE_REPO" -ForegroundColor Cyan
