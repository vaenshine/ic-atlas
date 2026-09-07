#!/bin/zsh
# Double-click in Finder to start the local learning workspace.
cd -- "$(dirname -- "$0")" || exit 1
export PATH="/opt/homebrew/bin:/usr/local/bin:$PATH"
readonly ic_atlas_port="${IC_ATLAS_PORT:-3000}"
if [[ "$ic_atlas_port" != <1-65535> ]]; then
  print 'IC_ATLAS_PORT must be 1–65535. / IC_ATLAS_PORT 必须在 1–65535 之间。'
  exit 1
fi
readonly ic_atlas_url="http://127.0.0.1:${ic_atlas_port}/"
if ! command -v npm >/dev/null 2>&1; then
  print '请先安装 Node.js 22.13 或更高版本，再重新打开此文件。'
  read '?按回车退出…'
  exit 1
fi
if [[ ! -d node_modules ]]; then
  npm ci || exit 1
fi
if curl --silent --fail --max-time 2 "$ic_atlas_url" >/dev/null; then
  open "$ic_atlas_url"
  exit 0
fi
(
  for attempt in {1..90}; do
    if curl --silent --fail --max-time 2 "$ic_atlas_url" >/dev/null; then
      open "$ic_atlas_url"
      break
    fi
    sleep 1
  done
) &
print '芯片实验室正在启动。关闭此终端窗口会停止本地服务。'
npm run dev
