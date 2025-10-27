@echo off
echo 正在复制文件到移动设备...
echo.

REM 请修改下面的路径为你的 Obsidian 库路径
set OBSIDIAN_PATH="../Doc/.obsidian\plugins\cf-imageBed"

REM 创建插件目录（如果不存在）
if not exist %OBSIDIAN_PATH% (
    mkdir %OBSIDIAN_PATH%
)

REM 复制文件
copy main.js %OBSIDIAN_PATH%\
copy manifest.json %OBSIDIAN_PATH%\
copy styles.css %OBSIDIAN_PATH%\

echo.
echo 文件复制完成！
echo 请在 Obsidian 中重新加载插件或重启应用
echo.
pause
