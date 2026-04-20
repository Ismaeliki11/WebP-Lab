[CmdletBinding()]
param(
  [string]$Message = ""
)

Set-StrictMode -Version Latest
$ErrorActionPreference = "Stop"

$repoRoot = Split-Path -Parent $MyInvocation.MyCommand.Path
Set-Location -LiteralPath $repoRoot

function Invoke-Git {
  param(
    [Parameter(Mandatory = $true)]
    [string[]]$Arguments
  )

  & git @Arguments
  if ($LASTEXITCODE -ne 0) {
    throw "git $($Arguments -join ' ') failed with exit code $LASTEXITCODE."
  }
}

try {
  $null = & git rev-parse --show-toplevel 2>$null
  if ($LASTEXITCODE -ne 0) {
    throw "Esta carpeta no es un repositorio Git."
  }

  $branch = (& git rev-parse --abbrev-ref HEAD).Trim()
  if ($LASTEXITCODE -ne 0) {
    throw "No se pudo detectar la rama actual."
  }

  if ($branch -ne "master") {
    throw "La rama actual es '$branch'. El OMV despliega desde 'master'. Cambia a master antes de publicar."
  }

  Invoke-Git -Arguments @("pull", "--ff-only", "origin", $branch)
  Invoke-Git -Arguments @("add", "-A")

  & git diff --cached --quiet
  if ($LASTEXITCODE -eq 0) {
    Write-Host "No hay cambios pendientes para publicar." -ForegroundColor Yellow
    Write-Host "La web del OMV ya está al día con GitHub." -ForegroundColor Yellow
    exit 0
  }

  if ([string]::IsNullOrWhiteSpace($Message)) {
    $timestamp = Get-Date -Format "yyyy-MM-dd HH:mm:ss"
    $Message = "Update WebP Lab $timestamp"
  }

  Invoke-Git -Arguments @("commit", "-m", $Message)
  Invoke-Git -Arguments @("push", "origin", $branch)

  Write-Host ""
  Write-Host "Cambios publicados en GitHub." -ForegroundColor Green
  Write-Host "El OMV debería actualizarse automáticamente en aproximadamente 1 minuto." -ForegroundColor Green
}
catch {
  Write-Error $_
  exit 1
}
