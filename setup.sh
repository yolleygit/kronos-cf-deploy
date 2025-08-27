#!/bin/bash

# Kronos Live Forecast - 快速设置脚本
# 用于初始化 Cloudflare 自动化部署项目

set -e

echo "🔧 Kronos Live Forecast - 快速设置"
echo "=================================="

# 检查是否在正确的目录
if [ ! -f "README.md" ] || [ ! -d ".github" ]; then
    echo "❌ 请在 git-cf 目录中运行此脚本"
    exit 1
fi

# 创建必要的目录
echo "📁 创建必要的目录..."
mkdir -p data
mkdir -p records
mkdir -p predictions_raw/latest
mkdir -p web/public/data
mkdir -p logs

# 检查 web 目录中的 package.json
if [ ! -f "web/package.json" ]; then
    echo "❌ 缺少 web/package.json 文件"
    exit 1
fi

# 安装前端依赖
echo "📦 安装前端依赖..."
cd web
npm install
cd ..

# 检查 Python 依赖
if [ ! -f "configs/requirements.txt" ]; then
    echo "❌ 缺少 configs/requirements.txt 文件"
    exit 1
fi

echo "🐍 检查 Python 依赖..."
echo "请确保已安装以下 Python 包："
echo "  - torch"
echo "  - pandas"
echo "  - numpy"
echo "  - matplotlib"
echo "  - pyyaml"
echo "  - python-binance"
echo "  - boto3"
echo ""
echo "可以使用以下命令安装："
echo "pip install -r configs/requirements.txt"

# 创建示例环境变量文件
echo "🔧 创建环境变量示例文件..."
cat > .env.example << EOF
# Cloudflare R2 配置
R2_ACCOUNT_ID=your_account_id_here
R2_ACCESS_KEY_ID=your_access_key_id_here
R2_SECRET_ACCESS_KEY=your_secret_access_key_here
R2_BUCKET=kronos-prod
R2_PUBLIC_BASE=https://your_account_id.r2.cloudflarestorage.com/kronos-prod

# Binance API 配置 (可选)
BINANCE_API_KEY=your_binance_api_key_here
BINANCE_SECRET_KEY=your_binance_secret_key_here

# Next.js 环境变量
NODE_ENV=production
EOF

echo "✅ 设置完成！"
echo ""
echo "📋 接下来的步骤："
echo ""
echo "1. 🔑 配置 Cloudflare R2"
echo "   - 创建 R2 存储桶: kronos-prod"
echo "   - 创建 API Token"
echo "   - 更新 .env.example 中的配置"
echo ""
echo "2. 🚀 部署到 GitHub"
echo "   - 创建 GitHub 仓库"
echo "   - 运行: ./deploy.sh https://github.com/用户名/仓库名.git"
echo ""
echo "3. ⚙️ 配置 GitHub Secrets"
echo "   - 将 .env.example 中的值添加到 GitHub Secrets"
echo ""
echo "4. 🌐 部署到 Cloudflare Pages"
echo "   - 连接 GitHub 仓库"
echo "   - 配置构建设置"
echo ""
echo "📖 详细说明请查看 README.md"
