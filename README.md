# Kronos Live Forecast - Cloudflare 自动化部署版

## 🚀 项目概述

这是 Kronos Live Forecast 的 Cloudflare 自动化部署版本，采用以下架构：

- **前端**: Cloudflare Pages (Next.js)
- **存储**: Cloudflare R2 (预测数据和图表)
- **计算**: GitHub Actions (定时运行预测)
- **数据源**: ccxt (统一交易所 API)

## 📋 部署前准备

### 1. Cloudflare 配置

#### 1.1 创建 R2 存储桶
1. 登录 [Cloudflare Dashboard](https://dash.cloudflare.com/)
2. 进入 **R2 Object Storage**
3. 创建新存储桶：`kronos-prod`
4. 设置权限为 **Public** (或配置自定义域名)

#### 1.2 创建 API Token
1. 进入 **My Profile** → **API Tokens**
2. 创建自定义 Token：
   - **Permissions**: 
     - `Cloudflare R2:Edit`
     - `Account:Read`
   - **Account Resources**: 选择你的账户
   - **Zone Resources**: 选择你的域名 (可选)

3. 记录以下信息（请勿在仓库中明文保存任何密钥）：
   ```
   R2_ACCOUNT_ID=<your_cloudflare_account_id>
   R2_ACCESS_KEY_ID=<your_r2_access_key_id>
   R2_SECRET_ACCESS_KEY=<your_r2_secret_access_key>
   R2_BUCKET=kronos-prod
   R2_PUBLIC_BASE=https://<your_cloudflare_account_id>.r2.cloudflarestorage.com/kronos-prod
   ```

### 2. GitHub 仓库配置

#### 2.1 创建新仓库
1. 在 GitHub 创建新仓库：`kronos-cf-deploy`
2. 不要初始化 README、.gitignore 或 license

#### 2.2 配置 Secrets
1. 进入仓库 **Settings** → **Secrets and variables** → **Actions**
2. 添加以下 Repository secrets：
   ```
   R2_ACCOUNT_ID=<your_cloudflare_account_id>
   R2_ACCESS_KEY_ID=<your_r2_access_key_id>
   R2_SECRET_ACCESS_KEY=<your_r2_secret_access_key>
   R2_BUCKET=kronos-prod
   R2_PUBLIC_BASE=https://<your_cloudflare_account_id>.r2.cloudflarestorage.com/kronos-prod
   ```

## 🛠️ 部署步骤

### 1. 推送代码到 GitHub
```bash
# 在 git-cf 目录中
git remote add origin https://github.com/你的用户名/kronos-cf-deploy.git
git add .
git commit -m "Initial commit: Cloudflare automation setup"
git push -u origin main
```

### 2. 部署到 Cloudflare Pages

#### 2.1 连接 GitHub 仓库
1. 登录 [Cloudflare Dashboard](https://dash.cloudflare.com/)
2. 进入 **Pages**
3. 点击 **Create a project**
4. 选择 **Connect to Git**
5. 选择你的 `kronos-cf-deploy` 仓库

#### 2.2 配置构建设置
```
Framework preset: Next.js
Root directory: web
Build command: npm run build
Build output directory: .next
Node.js version: 18
```

#### 2.3 环境变量
在 Pages 项目设置中添加：
```
R2_PUBLIC_BASE=https://<your_cloudflare_account_id>.r2.cloudflarestorage.com/kronos-prod
NODE_ENV=production
```

### 3. 验证部署
1. 等待 GitHub Actions 首次运行完成
2. 访问你的 Cloudflare Pages URL
3. 检查 R2 存储桶中是否有数据文件

## 🔄 自动化流程

### GitHub Actions 工作流
- **触发**: 每小时自动运行 + 手动触发
- **任务**:
  1. 安装 Python 依赖
  2. 使用 ccxt 拉取数据并运行 BTC 预测
  3. 使用 ccxt 拉取数据并运行 ETH 预测
  4. 生成图表
  5. 上传所有文件到 R2

### 数据流向
```
GitHub Actions → 预测计算（ccxt数据） → R2 存储 → Cloudflare Pages 前端
```

## 📊 监控和维护

### 查看运行状态
1. **GitHub Actions**: 仓库 → Actions 标签页
2. **R2 存储**: Cloudflare Dashboard → R2 → kronos-prod
3. **Pages 日志**: Cloudflare Dashboard → Pages → 项目 → Functions 标签页

### 手动触发
```bash
# 在 GitHub 仓库页面
Actions → Publish forecasts to R2 → Run workflow
```

### 更新配置
1. 修改 `configs/config.btc.yaml` 或 `configs/config.eth.yaml`
2. 提交并推送
3. GitHub Actions 会自动使用新配置

## 🚨 故障排除

### 常见问题

#### 1. R2 上传失败
- 检查 GitHub Secrets 是否正确
- 确认 R2 存储桶权限设置
- 查看 Actions 日志中的详细错误

#### 2. 前端无法加载数据
- 确认 `R2_PUBLIC_BASE` 环境变量正确
- 检查 R2 文件是否成功上传
- 查看浏览器开发者工具的网络请求

#### 3. 预测计算失败
- 检查 ccxt 接口是否被限流或网络异常
- 确认 Python 依赖版本兼容
- 查看 Actions 日志中的 Python 错误

### 日志位置
- **GitHub Actions**: 仓库 Actions 页面
- **Cloudflare Pages**: Dashboard → Pages → 项目 → Functions
- **R2 访问日志**: Dashboard → R2 → 存储桶 → Analytics

## 📈 扩展功能

### 添加新币种
1. 复制 `configs/config.btc.yaml` 为 `configs/config.新币种.yaml`
2. 修改 `symbol` 字段
3. 更新 `.github/workflows/publish-to-r2.yml` 中的币种列表
4. 提交并推送

### 自定义预测频率
修改 `.github/workflows/publish-to-r2.yml` 中的 cron 表达式：
```yaml
on:
  schedule:
    - cron: "*/30 * * * *"  # 每30分钟
    - cron: "0 */2 * * *"   # 每2小时
```

### 添加通知
在 workflow 中添加 Slack、Discord 或邮件通知：
```yaml
- name: Notify on success
  uses: 8398a7/action-slack@v3
  with:
    status: success
    webhook_url: ${{ secrets.SLACK_WEBHOOK }}
```

## 🔐 安全注意事项

1. **切勿在 README 或代码中泄露任何密钥**（包括 Account ID、Access Key、Secret 等）。
2. 所有敏感信息必须存放在 GitHub Secrets 中。
3. R2 权限使用最小化原则，只授予必要的访问权限。
4. 重要数据建议定期备份到其他存储。

## 📞 支持

如遇问题，请检查：
1. GitHub Actions 运行日志
2. Cloudflare Pages 函数日志
3. 浏览器开发者工具控制台
4. R2 存储桶文件状态

---

**部署完成后，你的 Kronos Live Forecast 将完全自动化运行，无需本地维护！** 🎉
