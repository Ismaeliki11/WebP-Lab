@echo off
setlocal
powershell -NoProfile -ExecutionPolicy Bypass -File "%~dp0publish-webp-lab.ps1" %*
exit /b %errorlevel%
