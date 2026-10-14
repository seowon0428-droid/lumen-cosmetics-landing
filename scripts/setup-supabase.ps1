#Requires -Version 5.1
param(
  [string]$ProjectName = "lumen-landing-inquiries",
  [string]$Region = "ap-northeast-2",
  [string]$ProjectRef = "",
  [string]$DbPassword = ""
)

$ErrorActionPreference = "Stop"
$RepoRoot = Resolve-Path (Join-Path $PSScriptRoot "..")
Set-Location $RepoRoot

function Get-JsonPayload {
  param([string]$Text)
  $startArr = $Text.IndexOf("[")
  $endArr = $Text.LastIndexOf("]")
  if ($startArr -ge 0 -and $endArr -gt $startArr) {
    return $Text.Substring($startArr, $endArr - $startArr + 1)
  }
  $startObj = $Text.IndexOf("{")
  $endObj = $Text.LastIndexOf("}")
  if ($startObj -ge 0 -and $endObj -gt $startObj) {
    return $Text.Substring($startObj, $endObj - $startObj + 1)
  }
  throw "No JSON in Supabase CLI output."
}

function Invoke-Supabase {
  param([string[]]$Command)
  $prevEap = $ErrorActionPreference
  $ErrorActionPreference = "Continue"
  try {
    $output = & npx.cmd supabase @Command 2>&1
    if ($LASTEXITCODE -ne 0) {
      throw ($output | Out-String).Trim()
    }
    $text = ($output | ForEach-Object {
        if ($_ -is [System.Management.Automation.ErrorRecord]) { $_.ToString() } else { $_ }
      } | Out-String).Trim()
    return $text
  }
  finally {
    $ErrorActionPreference = $prevEap
  }
}

function Test-SupabaseLogin {
  try {
    Invoke-Supabase -Command @("projects", "list", "-o", "json") | Out-Null
    return $true
  }
  catch {
    return $false
  }
}

function Get-FirstOrgId {
  $json = Invoke-Supabase -Command @("orgs", "list", "-o", "json")
  $orgs = Get-JsonPayload $json | ConvertFrom-Json
  if (-not $orgs -or $orgs.Count -eq 0) {
    throw "No Supabase org found. Create one at https://supabase.com"
  }
  return $orgs[0].id
}

function Find-ProjectRefByName {
  param([string]$Name)
  $json = Invoke-Supabase -Command @("projects", "list", "-o", "json")
  $projects = Get-JsonPayload $json | ConvertFrom-Json
  foreach ($p in $projects) {
    if ($p.name -eq $Name) {
      return $p.id
    }
  }
  return $null
}

function Wait-ProjectReady {
  param([string]$Ref)
  $deadline = (Get-Date).AddMinutes(12)
  while ((Get-Date) -lt $deadline) {
    $json = Invoke-Supabase -Command @("projects", "list", "-o", "json")
    $projects = Get-JsonPayload $json | ConvertFrom-Json
    $p = $projects | Where-Object { $_.id -eq $Ref } | Select-Object -First 1
    if ($p -and $p.status -eq "ACTIVE_HEALTHY") {
      return
    }
    $status = if ($p) { $p.status } else { "unknown" }
    Write-Host "  Waiting for project ($status), retry in 30s..."
    Start-Sleep -Seconds 30
  }
  throw "Project not ready. Check dashboard, then rerun with -ProjectRef $Ref"
}

function Ensure-ProjectLinked {
  param([string]$Ref, [string]$Password)
  $linkArgs = @("link", "--project-ref", $Ref, "--yes")
  if ($Password) {
    $linkArgs += @("--password", $Password)
  }
  Invoke-Supabase -Command $linkArgs | Out-Null
}

function Apply-Schema {
  param([string]$Ref, [string]$Password)
  $schemaPath = Join-Path $RepoRoot "supabase\schema.sql"
  if (-not (Test-Path $schemaPath)) {
    throw "Missing schema.sql: $schemaPath"
  }
  try {
    Ensure-ProjectLinked -Ref $Ref -Password $Password
    Invoke-Supabase -Command @("db", "query", "--linked", "-f", $schemaPath) | Out-Null
    return $true
  }
  catch {
    Write-Host "  Could not apply SQL via CLI: $($_.Exception.Message)"
    Write-Host "  Open Supabase Dashboard -> SQL Editor, paste supabase/schema.sql, then Run."
    return $false
  }
}

function Get-AnonKey {
  param([string]$Ref)
  $json = Invoke-Supabase -Command @("projects", "api-keys", "--project-ref", $Ref, "-o", "json")
  $keys = Get-JsonPayload $json | ConvertFrom-Json
  foreach ($k in $keys) {
    if ($k.name -eq "anon") {
      return $k.api_key
    }
  }
  throw "anon API key not found"
}

function Write-LumenConfig {
  param([string]$Ref, [string]$AnonKey)
  $url = "https://$Ref.supabase.co"
  $configPath = Join-Path $RepoRoot "js\config.js"
  $lines = @(
    "window.LUMEN_CONFIG = {"
    "  SUPABASE_URL: `"$url`","
    "  SUPABASE_ANON_KEY: `"$AnonKey`","
    "};"
  )
  Set-Content -Path $configPath -Value $lines -Encoding UTF8
}

Write-Host "LUMEN Supabase setup"
Write-Host ""

if (-not (Test-SupabaseLogin)) {
  Write-Host "Supabase login required. Run: npx.cmd supabase login"
  exit 1
}

if ($ProjectRef) {
  $ref = $ProjectRef
  Write-Host "Using project ref: $ref"
}
else {
  $ref = Find-ProjectRefByName -Name $ProjectName
  if ($ref) {
    Write-Host "Using existing project: $ProjectName ($ref)"
  }
  else {
    $orgId = Get-FirstOrgId
    $dbPassword = -join ((48..57) + (65..90) + (97..122) | Get-Random -Count 24 | ForEach-Object { [char]$_ })
    Write-Host "Creating project: $ProjectName (region: $Region)"
    Write-Host "  DB password (save this): $dbPassword"
    Invoke-Supabase -Command @(
      "projects", "create", $ProjectName,
      "--org-id", $orgId,
      "--db-password", $dbPassword,
      "--region", $Region,
      "--yes"
    ) | Out-Null
    $ref = Find-ProjectRefByName -Name $ProjectName
    if (-not $ref) {
      throw "Could not find project ref after create"
    }
    Write-Host "  project ref: $ref"
  }
}

Wait-ProjectReady -Ref $ref
Write-Host "Applying schema..."
$schemaOk = Apply-Schema -Ref $ref -Password $DbPassword
Write-Host "Fetching API keys..."
$anon = Get-AnonKey -Ref $ref
Write-LumenConfig -Ref $ref -AnonKey $anon

Write-Host ""
Write-Host "Done. js/config.js updated."
if (-not $schemaOk) {
  Write-Host "Reminder: run supabase/schema.sql in SQL Editor before testing the form."
}
Write-Host "Dashboard: https://supabase.com/dashboard/project/$ref"
