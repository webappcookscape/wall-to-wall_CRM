@echo off
REM Wall-to-Wall CRM - Create or Update FA (Field Agent) User Script (Windows)
REM Usage:
REM   create-fa.bat
REM   create-fa.bat <email> <password>
REM   create-fa.bat <email> <password> "<full_name>" <username>

cd /d "%~dp0apps\api"
call npx tsx scripts/create-fa.ts %*
