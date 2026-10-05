#!/bin/sh
# ============================================================
#  冷战热斗 · GitHub Pages 一键部署
#  用法：sh deploy.sh <your-github-username>
# ============================================================
set -e
cd "$(dirname "$0")"

U="${1:?用法: sh deploy.sh <github用户名>}"
NAME="coldwar"
REMOTE="git@github.com:${U}/${NAME}.git"

echo "==> 目标仓库: ${REMOTE}"
echo "==> 部署地址: https://${U}.github.io/${NAME}/"
echo ""

# 本地还没提交的话先提交
git add -A
git diff --cached --quiet || git commit -q -m "deploy: cold war game update"

# 配置 remote
if git remote get-url origin >/dev/null 2>&1; then
  git remote set-url origin "$REMOTE"
else
  git remote add origin "$REMOTE"
fi

# 需要 git 凭据 —— 建议先加 SSH key，或改用 HTTPS
echo ""
echo "==> 检查 SSH 连接..."
if ssh -T -o BatchMode=yes -o ConnectTimeout=8 git@github.com >/dev/null 2>&1; then
  echo "    SSH OK"
else
  echo "    SSH 不通。请先把本机公钥加到 GitHub:"
  for k in ~/.ssh/id_ed25519.pub ~/.ssh/id_rsa.pub; do
    [ -f "$k" ] && echo "      $(cat "$k")"
  done
  echo "    添加后重试：sh deploy.sh $U"
  exit 1
fi

echo ""
echo "==> 推送到 main ..."
git push -u origin main

echo ""
echo "==> 完成！约 1 分钟后访问:"
echo "    https://${U}.github.io/${NAME}/"
echo ""
echo "==> 如果访问 404，去仓库 Settings → Pages → Source 选 'Deploy from a branch'"
echo "    Branch 选 main，Folder 选 / (root)，保存。"
echo ""
echo "==> 原曲（可选但推荐）:"
echo "    把 mp3 放进 assets/music/ 然后:"
echo "      git add assets/music/ && git commit -m 'music' && git push"
