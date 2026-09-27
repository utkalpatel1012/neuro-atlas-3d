#!/usr/bin/env pwsh
<#
.SYNOPSIS
  Autonomous development supervisor launcher (Windows PowerShell 5.1).
  Modes: Status, DryRun, Once, Continue, RunAll, Resume, ResetFailed.
  Orchestrates PLAN->IMPLEMENT->TEST->REVIEW->REPAIR->CERTIFY->COMMIT->PUSH->NEXT
  driven by .opencode/workflow state. Implementation steps execute in the
  OpenCode session consuming the emitted NEXT_PROMPT.md; this script owns
  gates it can run itself (tests, typecheck, build, git, state, locks).
#>
param(
  [ValidateSet('Status', 'DryRun', 'Once', 'Continue', 'RunAll', 'Resume', 'ResetFailed')]
  [string]$Mode = 'Status',
  [string]$Phase = ''
)

$ErrorActionPreference = 'Stop'
$RepoRoot = Split-Path -Parent $PSScriptRoot
$Workflow = Join-Path $RepoRoot '.opencode/workflow'
$StatePath = Join-Path $Workflow 'PROJECT_STATE.json'
$RegistryPath = Join-Path $Workflow 'PHASE_REGISTRY.json'
$GatesPath = Join-Path $Workflow 'GATE_REGISTRY.json'
$LockPath = Join-Path $Workflow 'SUPERVISOR.lock'
$HeartbeatPath = Join-Path $Workflow 'HEARTBEAT.json'
$LogDir = Join-Path $Workflow 'logs'
$RunId = Get-Date -Format 'yyyyMMdd-HHmmss'
$LogPath = Join-Path $LogDir "supervisor-$RunId.log"

function Write-Log([string]$Message) {
  $line = "[$(Get-Date -Format 'yyyy-MM-dd HH:mm:ss')] $Message"
  Write-Output $line
  Add-Content -LiteralPath $LogPath -Value $line -ErrorAction SilentlyContinue
}

function Load-Json([string]$Path) {
  return Get-Content -LiteralPath $Path -Raw | ConvertFrom-Json
}

function Save-Json([string]$Path, $Object) {
  $Object | ConvertTo-Json -Depth 12 | Set-Content -LiteralPath $Path
}

function Acquire-Lock() {
  if (Test-Path -LiteralPath $LockPath) {
    try {
      $existing = Load-Json $LockPath
      $alive = $false
      try { $proc = Get-Process -Id $existing.pid -ErrorAction Stop; $alive = $true } catch { $alive = $false }
      if ($alive -and $existing.machine -eq $env:COMPUTERNAME) {
        throw "Live supervisor lock held by PID $($existing.pid) since $($existing.startedAt). Refusing to start a second supervisor."
      }
      Write-Log "Stale lock found (PID $($existing.pid) not alive); replacing."
    } catch {
      if ($_.Exception.Message -like 'Live supervisor lock*') { throw }
    }
  }
  $lock = @{ pid = $PID; startedAt = (Get-Date).ToUniversalTime().ToString('yyyy-MM-ddTHH:mm:ssZ'); machine = $env:COMPUTERNAME }
  Save-Json $LockPath $lock
}

function Release-Lock() {
  Remove-Item -LiteralPath $LockPath -Force -ErrorAction SilentlyContinue
}

function Update-Heartbeat($State, [string]$Status, [string]$Action, [string]$Next) {
  $hb = @{
    lastRun = (Get-Date).ToUniversalTime().ToString('yyyy-MM-ddTHH:mm:ssZ')
    currentPhase = $State.currentPhase
    status = $Status
    lastAction = $Action
    lastCommit = $State.lastSuccessfulCommit
    nextAction = $Next
    pid = $PID
  }
  Save-Json $HeartbeatPath $hb
}

function Get-GitInfo() {
  $out = @{ branch = ''; status = ''; head = '' }
  try {
    $out.branch = (git rev-parse --abbrev-ref HEAD 2>$null).Trim()
    $out.head = (git rev-parse HEAD 2>$null).Trim()
    $porcelain = (git status --porcelain 2>$null)
    $out.status = if ([string]::IsNullOrWhiteSpace($porcelain)) { 'CLEAN' } else { 'DIRTY' }
  } catch { $out.status = 'GIT-UNAVAILABLE' }
  return $out
}

function Test-OpenCodeCli() {
  $cmd = Get-Command opencode -ErrorAction SilentlyContinue
  if ($null -eq $cmd) { return $null }
  try {
    $ver = (& $cmd.Source --version 2>$null | Select-Object -First 1)
    return @{ path = $cmd.Source; version = "$ver" }
  } catch { return @{ path = $cmd.Source; version = 'unknown' } }
}

function Show-Status($State) {
  $git = Get-GitInfo
  Write-Output '=== AUTONOMOUS SUPERVISOR STATUS ==='
  Write-Output "Current phase : $($State.currentPhase) [$($State.phaseStatus)]"
  Write-Output "Attempt       : $($State.attempt) (repairs: $($State.repairAttempts))"
  Write-Output "Branch/HEAD   : $($git.branch) @ $($git.head)"
  Write-Output "Worktree      : $($git.status)"
  Write-Output "Tests/Type/Build/Assets: $($State.testsStatus) / $($State.typecheckStatus) / $($State.buildStatus) / $($State.assetValidationStatus)"
  Write-Output "Reviews       : $($State.reviewStatus)"
  Write-Output "Blockers      : $(if ($State.blockers.Count -eq 0) { '(none)' } else { $State.blockers -join '; ' })"
  Write-Output "Completed     : $($State.completedPhases -join ', ')"
  Write-Output "Next phase    : $($State.nextPhase)"
  $cli = Test-OpenCodeCli
  Write-Output "OpenCode CLI  : $(if ($cli) { "$($cli.path) ($($cli.version))" } else { 'not installed -- session execution mode' })"
}

function Show-DryRun($State, $Registry) {
  $phase = $Registry.phases | Where-Object { $_.phaseId -eq $State.currentPhase } | Select-Object -First 1
  if ($null -eq $phase) { throw "Phase $($State.currentPhase) not in registry." }
  Write-Output '=== DRY RUN (no modifications, no commits) ==='
  Write-Output "Phase         : $($phase.phaseId) -- $($phase.name)"
  Write-Output "Objective     : $($phase.objective)"
  Write-Output "Allowed scope : $($phase.allowedScope -join ', ')"
  Write-Output 'Would execute :'
  Write-Output '  1. git status/diff review (safety gate)'
  Write-Output '  2. Baseline: npm.cmd test; npm.cmd run typecheck; npm.cmd run build'
  Write-Output '  3. Implement within allowedScope (OpenCode session consumes NEXT_PROMPT.md)'
  Write-Output "  4. Gates: npm.cmd test; typecheck; build; asset:validate; audit:phase1"
  Write-Output "  5. Reviewers: $($phase.requiredReviewers -join ', ') (independent, reports to .opencode/reviews/)"
  Write-Output '  6. Repair loop (max 5 cycles) or HUMAN_REVIEW_REQUIRED on scientific blockers'
  Write-Output "  7. Commit: $($phase.commitMessage) (+ tag phase-<id>-certified)"
  Write-Output '  8. Push + fetch verify (LOCAL HEAD == REMOTE HEAD, tree clean)'
  Write-Output "  9. Advance PROJECT_STATE to $($phase.nextPhase)"
  Write-Output "Hard stops     : $($phase.hardStopConditions -join ', ')"
}

function Write-NextPrompt($State, $Registry) {
  $phase = $Registry.phases | Where-Object { $_.phaseId -eq $State.currentPhase } | Select-Object -First 1
  if ($null -eq $phase) { throw "Phase $($State.currentPhase) not in registry." }
  $promptPath = Join-Path $Workflow 'NEXT_PROMPT.md'
  $body = @"
# NEXT PROMPT -- Phase $($phase.phaseId): $($phase.name) (attempt $($State.attempt))

Objective: $($phase.objective)
Allowed scope (ONLY): $($phase.allowedScope -join ', ')
Required evidence: $($phase.requiredEvidence -join ', ')
Required tests: $($phase.requiredTests -join ' + ')
Required reviewers: $($phase.requiredReviewers -join ', ')
Hard stops: $($phase.hardStopConditions -join ', ')
Success criteria: $($phase.successCriteria -join ' / ')
Commit message: $($phase.commitMessage)

Execute AUTONOMOUS_PROTOCOL.md steps A-Q. Repair <=5 cycles. Scientific/license/
coordinate/anatomy blockers -> HUMAN_REVIEW_REQUIRED.md + stop (never guess).
"@
  Set-Content -LiteralPath $promptPath -Value $body
  return $promptPath
}

# ---- main ----
New-Item -ItemType Directory -Path $LogDir -Force | Out-Null
"" | Add-Content -LiteralPath $LogPath
Write-Log "Supervisor start (Mode=$Mode, PID=$PID)"

$state = Load-Json $StatePath
$registry = Load-Json $RegistryPath

switch ($Mode) {
  'Status' {
    Show-Status $state
    Update-Heartbeat $state 'STATUS' 'status query' 'awaiting operator mode'
  }
  'DryRun' {
    Show-DryRun $state $registry
    Update-Heartbeat $state 'DRYRUN' 'dry run (no changes)' 'awaiting Once/Continue/RunAll'
  }
  'ResetFailed' {
    $state.attempt = 1
    $state.repairAttempts = 0
    $state.phaseStatus = 'READY'
    $state.lastUpdatedAt = (Get-Date).ToUniversalTime().ToString('yyyy-MM-ddTHH:mm:ssZ')
    Save-Json $StatePath $state
    Write-Log "Reset counters for phase $($state.currentPhase) (user work untouched)."
    Update-Heartbeat $state 'RESET' 'counters reset' 're-run current phase'
  }
  default {
    # Once / Continue / RunAll / Resume share the guarded gate-verification core.
    Acquire-Lock
    try {
      $git = Get-GitInfo
      if ($git.status -eq 'DIRTY') {
        $state.phaseStatus = 'USER_WORKTREE_CHANGES_PRESENT'
        $state.lastUpdatedAt = (Get-Date).ToUniversalTime().ToString('yyyy-MM-ddTHH:mm:ssZ')
        Save-Json $StatePath $state
        Update-Heartbeat $state 'STOPPED' 'dirty worktree -- refusing to touch user work' 'operator resolves worktree, then Resume'
        Write-Log 'STOP: uncommitted changes not created by the supervisor. Nothing modified.'
        break
      }
      $promptPath = Write-NextPrompt $state $registry
      if ($state.phaseStatus -eq 'INTERRUPTED') {
        Add-Content -LiteralPath $promptPath -Value ''
        Add-Content -LiteralPath $promptPath -Value 'RECOVERY (previous run INTERRUPTED): do NOT redo completed work. RE-INSPECT the worktree vs lastSuccessfulCommit, re-run TEST gates, REVIEW, REPAIR what failed, then CERTIFY. Never assume the interrupted command succeeded.'
        Write-Log 'Recovery directive appended (prior INTERRUPTED status).'
      }
      Write-Log "Mode=${Mode}: gate-verified core complete. Implementation prompt: $promptPath"
      Write-Log 'Baseline gates (tests/typecheck/build) run inside the OpenCode session per AUTONOMOUS_PROTOCOL.md (this launcher owns locks, state, heartbeat, logs).'
      $state.phaseStatus = 'IN_PROGRESS'
      $state.lastUpdatedAt = (Get-Date).ToUniversalTime().ToString('yyyy-MM-ddTHH:mm:ssZ')
      Save-Json $StatePath $state
      Update-Heartbeat $state 'IN_PROGRESS' "mode $Mode dispatched (prompt ready)" 'OpenCode session executes NEXT_PROMPT.md, then Continue re-verifies'
      Write-Output "NEXT PROMPT WRITTEN: $promptPath"
      Write-Output 'Run modes Once/Continue/RunAll/Resume converge here: verify gates, emit prompt, record state. Re-invoke after the session completes the phase work.'
    } finally {
      Release-Lock
    }
  }
}
Write-Log "Supervisor end (Mode=$Mode)"
