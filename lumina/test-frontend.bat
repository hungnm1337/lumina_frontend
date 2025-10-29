@echo off
echo Testing Frontend Chatbox...

echo.
echo Step 1: Installing dependencies...
npm install

echo.
echo Step 2: Building Angular project...
ng build

if %ERRORLEVEL% EQU 0 (
    echo ✅ Frontend build successful!
    echo.
    echo To run the frontend:
    echo   ng serve
    echo.
    echo To test the chatbox:
    echo   1. Open http://localhost:4200
    echo   2. Click "AI Tutor" in header
    echo   3. Start chatting!
) else (
    echo ❌ Frontend build failed! Check errors above.
)

pause
