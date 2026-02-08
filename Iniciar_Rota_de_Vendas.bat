@echo off
TITLE Rota de Vendas Inteligente
COLOR 0B
CLS

ECHO ========================================================
ECHO      Iniciando Rota de Vendas Inteligente (Vendas A.I.)
ECHO ========================================================
ECHO.

:: Mudar para o diretorio do script
CD /D "%~dp0"

:: Sincronizacao com GitHub
ECHO [Sincronismo] Buscando atualizacoes na nuvem (GitHub)...
git pull origin main
IF %ERRORLEVEL% NEQ 0 (
    ECHO [AVISO] Nao foi possivel sincronizar com o GitHub. 
    ECHO [AVISO] Continuando com a versao local...
) ELSE (
    ECHO [OK] Codigo atualizado com sucesso!
)
ECHO.

:: Limpar processos Node antigos
ECHO [INFO] Preparando ambiente...
TASKKILL /F /IM node.exe /T >nul 2>&1

:: Verificar Node.js
WHERE node >nul 2>nul
IF %ERRORLEVEL% NEQ 0 (
    ECHO [ERRO] Node.js nao encontrado. Instale o Node.js em: https://nodejs.org/
    PAUSE
    EXIT /B
)

:: Instalar dependencias se necessario
IF NOT EXIST "node_modules" (
    ECHO [INFO] Instalando dependencias pela primeira vez...
    CALL npm install
)

:: Iniciar servidor em segundo plano e abrir navegador
ECHO [INFO] Servidor iniciando na porta 3000...
ECHO [INFO] O navegador abrira em instantes.
ECHO.

:: Usar timeout para dar tempo do servidor subir antes de abrir o navegador
START /B npm run dev
timeout /t 5 /nobreak >nul
START "" "http://localhost:3000"

ECHO.
ECHO Servidor em execucao. 
ECHO Deixe esta janela aberta enquanto usa o sistema.
ECHO.
ECHO Pressione CTRL+C para encerrar.

PAUSE
