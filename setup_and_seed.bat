@echo off
title BankRetain - Database Setup & Synthetic Seeding
color 0a

echo ===============================================================================
echo       BANKRETAIN: DATABASE SCHEMA INITIALIZATION & SYNTHETIC DATA SEEDING
echo ===============================================================================
echo.

cd /d "%~dp0server"

:: Ensure .env exists
if not exist "..\.env" (
    copy "..\.env.example" "..\.env" >nul
)

:: Step 0: Test connection
echo [*] Testing connection to MySQL on port 3306...
call node scripts/checkDb.js >nul 2>nul
if %ERRORLEVEL% NEQ 0 (
    echo.
    echo ===============================================================================
    echo [ATTENTION] MySQL root password required.
    echo The current password in .env was rejected by your local MySQL server.
    echo ===============================================================================
    echo.
    set /p USER_PASS="Please type your MySQL root password and press Enter: "
    call node scripts/checkDb.js "%USER_PASS%"
    if %ERRORLEVEL% NEQ 0 (
        color 0c
        echo.
        echo [ERROR] Could not connect to MySQL with the entered password.
        echo Please ensure MySQL 8.0 is running and check your root password.
        pause
        exit /b 1
    )
    echo [OK] Password verified and saved to .env!
)

echo.
echo [1/2] Initializing MySQL Schema (17 Tables)...
call npm.cmd run db:init

echo.
echo [2/2] Seeding 250 Realistic Corporate Customers with 12-Month Histories...
call npm.cmd run db:seed

echo.
echo ===============================================================================
echo [SUCCESS] Database setup and seed complete!
echo You can now launch the application by double-clicking system.bat
echo ===============================================================================
pause
