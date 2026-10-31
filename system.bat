@echo off
title BankRetain System Launcher
color 0b

echo ===============================================================================
echo            BANKRETAIN: CORPORATE BANKING ATTRITION ANALYTICS
echo ===============================================================================
echo.

cd /d "%~dp0"

:: 1. Verify Node.js
where node >nul 2>nul
if %ERRORLEVEL% NEQ 0 (
    color 0c
    echo [ERROR] Node.js is not found in your system PATH.
    echo Please ensure Node.js 24 is installed and accessible.
    pause
    exit /b 1
)

:: 2. Ensure .env exists
if not exist ".env" (
    echo [INFO] Creating .env configuration from .env.example...
    copy ".env.example" ".env" >nul
)

:: 3. Launch Backend in separate window
echo [1/3] Starting BankRetain Backend Service on port 5000...
start "BankRetain Backend Service [Port 5000]" cmd /k "cd /d "%~dp0server" && title BankRetain Backend Service && npm.cmd start"

:: Brief wait for backend process startup
ping 127.0.0.1 -n 4 >nul

:: 4. Launch Frontend in separate window
echo [2/3] Starting BankRetain Frontend Client on port 3000...
start "BankRetain Frontend Client [Port 3000]" cmd /k "cd /d "%~dp0client" && title BankRetain Frontend Client && npm.cmd run dev"

:: Brief wait for frontend server
ping 127.0.0.1 -n 4 >nul

:: 5. Open browser
echo [3/3] Opening BankRetain Web Dashboard in your browser...
start http://localhost:3000

echo.
echo ===============================================================================
echo   BankRetain is running!
echo.
echo   Frontend URL:   http://localhost:3000
echo   Backend URL:    http://localhost:5000
echo   Health Status:  http://localhost:5000/api/health
echo.
echo   Demonstration User Accounts:
echo   - Administrator:        admin / Admin@123
echo   - Relationship Manager: rm_sarah / Rm@123
echo   - Analytics Viewer:     analyst_john / Analyst@123
echo.
echo   To shut down both servers, close their terminal windows or run stop.bat
echo ===============================================================================
echo.
pause
