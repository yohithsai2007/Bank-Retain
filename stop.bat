@echo off
title BankRetain - Stopping System
color 0c

echo ===============================================================================
echo            BANKRETAIN: STOPPING SERVICES
echo ===============================================================================
echo.

echo Terminating backend process on port 5000...
for /f "tokens=5" %%a in ('netstat -aon ^| find ":5000" ^| find "LISTENING"') do (
    taskkill /F /PID %%a >nul 2>nul
)

echo Terminating frontend process on port 3000...
for /f "tokens=5" %%a in ('netstat -aon ^| find ":3000" ^| find "LISTENING"') do (
    taskkill /F /PID %%a >nul 2>nul
)

echo.
echo [INFO] BankRetain frontend and backend services have been stopped.
echo ===============================================================================
pause
