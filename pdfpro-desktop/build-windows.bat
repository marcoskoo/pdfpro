@echo off
REM ============================================================
REM  PDFPro v2.9.8 - Compilar instalador + portable (Windows)
REM  Requiere Node.js LTS (https://nodejs.org) con npm
REM ============================================================
cd /d "%~dp0"
echo.
echo [1/2] Instalando dependencias (una sola vez)...
call npm install || goto :error
echo.
echo [2/2] Compilando PDFPro (instalador NSIS + portable x64)...
call npx electron-builder --win nsis portable --x64 || goto :error
echo.
echo ============================================================
echo  LISTO. Archivos generados en la carpeta "dist":
echo   - PDFPro-Setup-2.9.8.exe    (instalador de un clic)
echo   - PDFPro-Portable-2.9.8.exe (version portable)
echo ============================================================
explorer dist
pause
exit /b 0

:error
echo.
echo ERROR: la compilacion fallo. Revisa el mensaje de arriba.
pause
exit /b 1
