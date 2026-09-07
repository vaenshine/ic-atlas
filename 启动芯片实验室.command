#!/bin/zsh
# Double-click in Finder to start the local learning workspace.
cd -- "$(dirname -- "$0")" || exit 1
export PATH="/opt/homebrew/bin:/usr/local/bin:$PATH"
if ! command -v npm >/dev/null 2>&1; then
  print '请先安装 Node.js 22.13 或更高版本，再重新打开此文件。'
  read '?按回车退出…'
  exit 1
fi
if [[ ! -d node_modules ]]; then
  npm install || exit 1
fi
if curl --silent --fail --max-time 2 http://127.0.0.1:3000/ >/dev/null; then
  open http://127.0.0.1:3000/
  exit 0
fi
(
  for attempt in {1..30}; do
    if curl --silent --fail --max-time 2 http://127.0.0.1:3000/ >/dev/null; then
      open http://127.0.0.1:3000/
      break
    fi
    sleep 1
  done
) &
print '芯片实验室正在启动。关闭此终端窗口会停止本地服务。'
npm run dev
