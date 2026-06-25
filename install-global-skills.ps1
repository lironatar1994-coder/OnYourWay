param(
  [string]$Destination = (Join-Path $HOME '.codex\skills'),
  [switch]$Overwrite
)

$ErrorActionPreference = 'Stop'

$Root = Split-Path -Parent $MyInvocation.MyCommand.Path
$SourceRoot = Join-Path $Root 'skills'
$SkillNames = @('theme-factory', 'frontend-design', 'skill-creator')

if (!(Test-Path -LiteralPath $SourceRoot)) {
  throw "Local skills directory not found: $SourceRoot"
}

$Destination = [System.IO.Path]::GetFullPath($Destination)
New-Item -ItemType Directory -Path $Destination -Force | Out-Null

foreach ($name in $SkillNames) {
  $source = Join-Path $SourceRoot $name
  $target = Join-Path $Destination $name

  if (!(Test-Path -LiteralPath (Join-Path $source 'SKILL.md'))) {
    throw "Missing SKILL.md for $name at $source"
  }

  if (Test-Path -LiteralPath $target) {
    if (!$Overwrite) {
      Write-Host "[skip] $name already exists at $target. Use -Overwrite to replace it."
      continue
    }

    $resolvedTarget = [System.IO.Path]::GetFullPath($target)
    if (!$resolvedTarget.StartsWith($Destination, [System.StringComparison]::OrdinalIgnoreCase)) {
      throw "Refusing to remove path outside destination: $resolvedTarget"
    }

    Remove-Item -LiteralPath $resolvedTarget -Recurse -Force
  }

  Copy-Item -LiteralPath $source -Destination $target -Recurse
  Write-Host "[installed] $name -> $target"
}

Write-Host ''
Write-Host 'Restart Codex to pick up new skills.'
