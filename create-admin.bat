@echo off
REM Wall-to-Wall CRM - Create or Update Admin User Script (Windows)
REM Usage:
REM   create-admin.bat
REM   create-admin.bat <email> <password>
REM   create-admin.bat <email> <password> "<full_name>" <username>

cd /d "%~dp0apps\api"
call npx tsx scripts/create-admin.ts %*
