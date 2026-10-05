# 三步部署（在终端里跑，一条搞定）

打开 Minis 终端，粘贴这一段：

```sh
cd /var/minis/workspace/coldwar

# 1. 生成 SSH key（如果没有）
[ -f ~/.ssh/id_ed25519 ] || ssh-keygen -t ed25519 -N "" -f ~/.ssh/id_ed25519

# 2. 打印公钥 —— 复制下面这行输出
cat ~/.ssh/id_ed25519.pub

# 3. 加 remote 并推送
git remote add origin git@github.com:你的用户名/coldwar.git 2>/dev/null || git remote set-url origin git@github.com:你的用户名/coldwar.git
git push -u origin main
```

部署后访问：**https://你的用户名.github.io/coldwar/**

---

## 关键：公钥必须加到 GitHub

第 2 步会打印一串 `ssh-ed25519 AAAA...` —— 把它贴到 GitHub：

**Settings → SSH and GPG keys → New SSH key**

（或者用 [Settings 快捷链接](https://github.com/settings/keys)）

然后跑第 3 步就能推了。

---

## 如果不想配 SSH，用 HTTPS + 令牌

```sh
# 先在 GitHub 生成 Personal Access Token（Settings → Developer settings → Tokens）
# 需要 repo 权限
git remote set-url origin https://github.com/你的用户名/coldwar.git
git push -u origin main
# 会提示输入用户名和 token
```

---

## 部署后 404？

仓库 **Settings → Pages → Build and deployment → Source** 选 `Deploy from a branch`，
Branch 选 `main`，Folder 选 `/ (root)`，Save。等 1 分钟。

---

## 原曲

放文件进 `assets/music/`：
- `us.mp3` — In the Moonlight (1928)
- `ussr.mp3` — В далёкой Маньчжурии (1945)

```sh
sh fetch_music.sh        # 自动抓 archive.org（有时限流）
git add assets/music/ && git commit -m "music" && git push
```

没有 mp3 也能玩，自动切 Web Audio 合成兜底。
