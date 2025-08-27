# 🚀 快速开始指南

## 一键部署到 Cloudflare

### 步骤 1: 准备 GitHub 仓库
```bash
# 1. 在 GitHub 创建新仓库 (不要初始化)
# 2. 复制仓库 URL，例如: https://github.com/你的用户名/kronos-cf-deploy.git
```

### 步骤 2: 运行部署脚本
```bash
# 在 git-cf 目录中
./deploy.sh https://github.com/你的用户名/kronos-cf-deploy.git
```

### 步骤 3: 配置 Cloudflare R2
1. 登录 [Cloudflare Dashboard](https://dash.cloudflare.com/)
2. 进入 **R2 Object Storage**
3. 创建存储桶：`kronos-prod`
4. 设置权限为 **Public**

### 步骤 4: 创建 API Token
1. 进入 **My Profile** → **API Tokens**
2. 创建自定义 Token：
   - **Permissions**: `Cloudflare R2:Edit`
   - **Account Resources**: 选择你的账户
3. 记录以下信息：
   ```
   Account ID: 你的账户ID
   Access Key ID: 生成的Access Key ID  
   Secret Access Key: 生成的Secret Access Key
   ```

### 步骤 5: 配置 GitHub Secrets
1. 进入你的 GitHub 仓库
2. **Settings** → **Secrets and variables** → **Actions**
3. 添加以下 Repository secrets：
   ```
   R2_ACCOUNT_ID=你的账户ID
   R2_ACCESS_KEY_ID=你的Access Key ID
   R2_SECRET_ACCESS_KEY=你的Secret Access Key
   R2_BUCKET=kronos-prod
   R2_PUBLIC_BASE=https://你的账户ID.r2.cloudflarestorage.com/kronos-prod
   ```

### 步骤 6: 部署到 Cloudflare Pages
1. 登录 [Cloudflare Dashboard](https://dash.cloudflare.com/)
2. 进入 **Pages**
3. **Create a project** → **Connect to Git**
4. 选择你的仓库，配置：
   ```
   Framework preset: Next.js
   Root directory: web
   Build command: npm run build
   Build output directory: .next
   Node.js version: 18
   ```
5. 在 **Environment variables** 中添加：
   ```
   R2_PUBLIC_BASE=https://你的账户ID.r2.cloudflarestorage.com/kronos-prod
   NODE_ENV=production
   ```

### 步骤 7: 手动触发首次运行
1. 在 GitHub 仓库页面
2. **Actions** → **Publish forecasts to R2** → **Run workflow**

## 🎉 完成！

部署完成后：
- 🌐 前端运行在 Cloudflare Pages
- 🔄 每小时自动更新预测数据
- ☁️ 所有数据存储在 Cloudflare R2
- 📊 支持 BTC 和 ETH 双币种预测

## 📊 监控状态

- **GitHub Actions**: 仓库 → Actions 标签页
- **R2 存储**: Cloudflare Dashboard → R2 → kronos-prod
- **Pages 日志**: Cloudflare Dashboard → Pages → 项目 → Functions

## 🔧 故障排除

### 常见问题

1. **R2 上传失败**
   - 检查 GitHub Secrets 是否正确
   - 确认 R2 存储桶权限设置

2. **前端无法加载数据**
   - 确认 `R2_PUBLIC_BASE` 环境变量正确
   - 检查 R2 文件是否成功上传

3. **预测计算失败**
   - 检查 Actions 日志中的 Python 错误
   - 确认依赖版本兼容

## 📞 支持

如遇问题，请检查：
1. GitHub Actions 运行日志
2. Cloudflare Pages 函数日志
3. 浏览器开发者工具控制台
4. R2 存储桶文件状态

---

**详细文档请查看 [README.md](README.md)**
