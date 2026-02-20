#!/bin/bash

# Claude Cockpit - 開發環境啟動腳本
# 在目前的 iTerm 視窗中開兩個分頁啟動前端和後端

PROJECT_DIR="$(cd "$(dirname "$0")" && pwd)"

osascript <<EOF
tell application "iTerm"
    activate

    tell current window
        -- 第一個分頁 (後端)
        tell current session
            write text "cd '$PROJECT_DIR/server' && npm run start:dev"
        end tell

        -- 建立第二個分頁 (前端)
        set clientTab to (create tab with default profile)
        tell current session of clientTab
            write text "cd '$PROJECT_DIR/client' && npm run dev"
        end tell
    end tell

end tell
EOF

echo "✅ 開發環境已啟動"
echo "   - Backend:  http://localhost:3001"
echo "   - Frontend: http://localhost:5173"
