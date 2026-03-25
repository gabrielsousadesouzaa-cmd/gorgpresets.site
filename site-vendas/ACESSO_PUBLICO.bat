@echo off
echo ==========================================
echo INICIANDO SEU SITE PUBLICO...
echo ==========================================
echo.
echo 1. Ligando o servidor local...
start /b npx vite --host
echo.
echo 2. Criando o link publico...
echo [AGUARDE ALGUNS SEGUNDOS PARA APARECER O LINK ABAIXO]
echo.
npx localtunnel --port 5173
pause
