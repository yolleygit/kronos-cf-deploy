#!/bin/bash

# Kronos Live Forecast - Cloudflare 自动化部署脚本
# 使用方法: ./deploy.sh [github_repo_url]

set -e

echo "🚀 Kronos Live Forecast - Cloudflare 自动化部署"
echo "================================================"

# 检查参数
if [ "$#" -eq 1 ]; then
    GITHUB_REPO=$1
    echo "📦 目标仓库: $GITHUB_REPO"
else
    echo "❌ 请提供 GitHub 仓库 URL"
    echo "使用方法: ./deploy.sh https://github.com/用户名/仓库名.git"
    exit 1
fi

# 检查必要的文件
echo "🔍 检查项目文件..."
required_files=(
    "README.md"
    ".github/workflows/publish-to-r2.yml"
    "web/app/api/dashboard/route.ts"
    "web/app/api/prediction-data/route.ts"
    "web/app/api/historical-data/route.ts"
    "configs/config.btc.yaml"
    "configs/config.eth.yaml"
    "run_single.py"
    "run_prediction.py"
)

for file in "${required_files[@]}"; do
    if [ ! -f "$file" ]; then
        echo "❌ 缺少必要文件: $file"
        exit 1
    fi
done

echo "✅ 所有必要文件检查通过"

# 检查 Git 状态
echo "📊 检查 Git 状态..."
if [ -z "$(git status --porcelain)" ]; then
    echo "✅ 工作目录干净"
else
    echo "⚠️ 工作目录有未提交的更改"
    git status --short
    read -p "是否继续部署? (y/N): " -n 1 -r
    echo
    if [[ ! $REPLY =~ ^[Yy]$ ]]; then
        echo "❌ 部署已取消"
        exit 1
    fi
fi

# 添加远程仓库
echo "🔗 配置远程仓库..."
if git remote get-url origin >/dev/null 2>&1; then
    echo "🔄 更新现有远程仓库..."
    git remote set-url origin "$GITHUB_REPO"
else
    echo "➕ 添加新的远程仓库..."
    git remote add origin "$GITHUB_REPO"
fi

# 提交更改
echo "💾 提交更改..."
git add .
git commit -m "feat: Cloudflare 自动化部署配置

- 添加 GitHub Actions 工作流
- 配置 R2 存储集成
- 修改 API 路由支持 R2 数据源
- 添加部署文档和脚本"

# 推送到 GitHub
echo "📤 推送到 GitHub..."
git push -u origin main

echo ""
echo "🎉 部署完成！"
echo "================================================"
echo "📋 接下来的步骤："
echo ""
echo "1. 🌐 配置 Cloudflare R2 存储桶"
echo "   - 登录 Cloudflare Dashboard"
echo "   - 创建 R2 存储桶: kronos-prod"
echo "   - 设置权限为 Public"
echo ""
echo "2. 🔑 创建 R2 API Token"
echo "   - 进入 My Profile → API Tokens"
echo "   - 创建自定义 Token (R2:Edit 权限)"
echo "   - 记录 Account ID, Access Key ID, Secret Access Key"
echo ""
echo "3. ⚙️ 配置 GitHub Secrets"
echo "   - 进入仓库 Settings → Secrets and variables → Actions"
echo "   - 添加以下 secrets:"
echo "     * R2_ACCOUNT_ID"
echo "     * R2_ACCESS_KEY_ID"
echo "     * R2_SECRET_ACCESS_KEY"
echo "     * R2_BUCKET=kronos-prod"
echo "     * R2_PUBLIC_BASE=https://你的账户ID.r2.cloudflarestorage.com/kronos-prod"
echo ""
echo "4. 🚀 部署到 Cloudflare Pages"
echo "   - 登录 Cloudflare Dashboard → Pages"
echo "   - Create a project → Connect to Git"
echo "   - 选择你的仓库，配置:"
echo "     * Framework preset: Next.js"
echo "     * Root directory: web"
echo "     * Build command: npm run build"
echo "     * Build output directory: .next"
echo ""
echo "5. 🔄 手动触发首次运行"
echo "   - 在 GitHub 仓库页面"
echo "   - Actions → Publish forecasts to R2 → Run workflow"
echo ""
echo "📖 详细文档请查看 README.md"
echo ""
echo "🌐 部署完成后，你的应用将在 Cloudflare Pages 上运行"
echo "🔄 每小时自动更新预测数据"
echo "☁️ 所有数据存储在 Cloudflare R2"
