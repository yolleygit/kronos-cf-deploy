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

### 3. 使用统一桶 kronos-prod 存储模型（公开）

由于 Cloudflare Pages 仅托管前端，模型权重不要放进 Git 或 Pages。现在统一使用同一个公开桶 `kronos-prod` 存放模型与前端产物，通过前缀进行隔离：

```
桶名：kronos-prod
模型前缀：kronos-model/
产物前缀：predictions_raw/、records/、public/
权限：Public（可配自定义域名，或使用 r2.dev 开发域）
```

2) 本地预上传模型权重到统一桶（公开读）

先从 Hugging Face 下载官方权重（任选其一）：

- Tokenizer: [NeoQuasar/Kronos-Tokenizer-base](https://huggingface.co/NeoQuasar/Kronos-Tokenizer-base)
- Model: [NeoQuasar/Kronos-base](https://huggingface.co/NeoQuasar/Kronos-base)

示例（使用 huggingface_hub 批量下载）：

```bash
pip install --upgrade huggingface_hub
python - << 'PY'
from huggingface_hub import snapshot_download
import shutil, os

os.makedirs('../Kronos_model', exist_ok=True)

tk_dir = snapshot_download('NeoQuasar/Kronos-Tokenizer-base')
md_dir = snapshot_download('NeoQuasar/Kronos-base')

shutil.copytree(tk_dir, '../Kronos_model/Kronos-Tokenizer-base', dirs_exist_ok=True)
shutil.copytree(md_dir, '../Kronos_model/Kronos-base', dirs_exist_ok=True)
print('✅ downloaded to ../Kronos_model')
PY
```

```bash
# 配置 R2 凭据（或在 shell profile 中预设）
export R2_ACCOUNT_ID=你的账户ID
export R2_ACCESS_KEY_ID=你的Access Key
export R2_SECRET_ACCESS_KEY=你的Secret Key
export R2_ENDPOINT="https://${R2_ACCOUNT_ID}.r2.cloudflarestorage.com"

# 本地模型目录结构（需与代码约定一致）
# ../Kronos_model/
# ├── Kronos-Tokenizer-base/{config.json, model.safetensors}
# └── Kronos-base/{config.json, model.safetensors}

aws s3 cp ../Kronos_model/ s3://kronos-prod/kronos-model/ \
  --endpoint-url ${R2_ENDPOINT} --recursive --acl public-read
```

3) 在工作流中添加“下载模型”步骤（位于安装依赖后、运行预测前）

在 `.github/workflows/publish-to-r2.yml` 的“Install Python dependencies”步骤之后，插入：

```yaml
- name: Download model from public R2 (kronos-prod)
  run: |
    echo "📥 Downloading model weights (public from kronos-prod)..."
    export AWS_NO_SIGN_REQUEST=1
    R2_ENDPOINT="https://${R2_ACCOUNT_ID}.r2.cloudflarestorage.com"
    mkdir -p Kronos_model
    aws s3 cp s3://${R2_BUCKET}/kronos-model/ Kronos_model/ \
      --endpoint-url "${R2_ENDPOINT}" \
      --recursive
    echo "✅ Model ready at ./Kronos_model"
```

5) 路径对齐说明

代码默认从 `../Kronos_model` 读取。GitHub Actions 的工作目录是仓库根目录，放在 `Kronos_model/` 与相对路径兼容（`core/update_predictions.py` 已按该结构读取）。

6) 目录隔离

- 模型与产物都在同一桶 `kronos-prod`，通过不同前缀隔离：
  - 模型：`kronos-model/`
  - 产物：`predictions_raw/`、`records/`、`public/`
  前端通过 `R2_PUBLIC_BASE` 读取公开产物；模型仅在 CI 下载，不在前端暴露引用路径。

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
