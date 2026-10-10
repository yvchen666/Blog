@echo off
chcp 65001 >nul
cd /d "%~dp0"

echo 正在生成本地预览，大约需要一两分钟...
call pnpm generate
if errorlevel 1 (
  echo.
  echo 构建失败，没有启动预览。
  pause
  exit /b 1
)

echo.
echo 预览已就绪：http://127.0.0.1:4173
echo 关闭这个窗口就会停止预览。
start "" http://127.0.0.1:4173
python -m http.server 4173 --directory .output\public
