@echo off
title GORG PRESETS - Go Live
color 0A

echo.
echo  ==========================================
echo   GORG PRESETS - Iniciando servidor...
echo  ==========================================
echo.

:: Verifica se o Vite ja esta rodando na porta 5173
netstat -ano | findstr ":5173" >nul 2>&1
if %errorlevel% == 0 (
    echo  [OK] Servidor ja esta rodando!
    echo  Abrindo navegador em http://localhost:5173
    timeout /t 1 /nobreak >nul
    start "" "http://localhost:5173"
    goto :end
)

echo  [INFO] Iniciando Vite Dev Server...
echo.

:: Inicia o servidor Vite em segundo plano
start "Vite Dev Server" cmd /c "npm run dev -- --host 2>&1"

:: Aguarda o servidor subir (verifica a porta)
echo  Aguardando servidor iniciar...
:wait_loop
timeout /t 1 /nobreak >nul
netstat -ano | findstr ":5173" >nul 2>&1
if %errorlevel% NEQ 0 goto :wait_loop

echo.
echo  ==========================================
echo   Servidor ativo! Abrindo navegador...
echo  ==========================================
echo.
echo  Local:   http://localhost:5173
echo  Rede:    Verifique o terminal do Vite

timeout /t 1 /nobreak >nul
start "" "http://localhost:5173"

:end
echo.
echo  Pressione qualquer tecla para fechar esta janela...
pause >nul
