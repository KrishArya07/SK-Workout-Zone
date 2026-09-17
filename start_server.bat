@echo off
title SK Workout Zone Web Server
echo ===================================================
echo   SK WORKOUT ZONE (UNISEX GYM) - WEB PORTAL
echo ===================================================
echo.
echo [1/2] Opening SK Workout in your web browser...
start "" "http://localhost:8000"
echo.
echo [2/2] Launching Python local web server on port 8000...
echo (To stop the server, close this window or press Ctrl+C)
echo.
python -m http.server 8000
pause
