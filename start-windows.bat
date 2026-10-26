@echo off
cd /d "%~dp0"
where node >nul 2>nul
if errorlevel 1 (
  echo.
  echo Node.js not found. Please install Node.js 18+ from https://nodejs.org/
  echo.
  pause
  exit /b 1
)
echo Starting Duanwang Cup on http://localhost:3000 ...
start "" /b cmd /c "timeout /t 2 >nul & start http://localhost:3000"
node server.js
echo.
echo Server stopped.
pause
