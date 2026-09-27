@echo off
REM Autonomous supervisor launcher wrapper (PowerShell execution policy blocks
REM unsigned .ps1 on this machine; npm.cmd works the same way). Forwards args.
powershell -NoProfile -NonInteractive -ExecutionPolicy Bypass -File "%~dp0autonomous-supervisor.ps1" %*
