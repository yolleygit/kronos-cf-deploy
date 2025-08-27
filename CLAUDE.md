# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

Kronos Live Forecast is an automated cryptocurrency prediction system that combines machine learning models with real-time data visualization. The system supports BTC and ETH forecasting using a hybrid architecture:

- **Backend**: Python-based ML pipeline with PyTorch/HuggingFace models
- **Frontend**: Next.js React dashboard with interactive charts 
- **Data Sources**: CCXT for unified exchange APIs, Binance as fallback
- **Infrastructure**: Cloudflare Pages + R2 storage with GitHub Actions automation

## Core Architecture

### ML Pipeline (Python)
- **Model**: Custom Kronos tokenizer with Binary Spherical Quantization (BSQuantizer)
- **Data Processing**: Real-time CCXT integration with fallback mechanisms
- **Prediction Engine**: Time-series forecasting with uncertainty quantification
- **Output**: JSON predictions, PNG charts, dashboard data files

### Web Dashboard (Next.js)
- **Framework**: Next.js 14 with TypeScript and Tailwind CSS
- **Charts**: Recharts for interactive price/prediction visualization
- **Data Sources**: R2-first with local fallback via API routes
- **Components**: Modular React components for metrics and charts

### Deployment Pipeline
- **CI/CD**: GitHub Actions with hourly automated predictions
- **Storage**: Cloudflare R2 for predictions, charts, and model weights
- **Hosting**: Cloudflare Pages for frontend with global CDN
- **Scheduling**: Cron-based execution (every hour at :05 minutes)

## Development Commands

### Python Backend
```bash
# Install Python dependencies
pip install -r configs/requirements.txt

# Run single prediction (BTC)
python run_single.py --config configs/config.btc.yaml

# Run single prediction (ETH) 
python run_single.py --config configs/config.eth.yaml

# Update predictions with full pipeline
python run_prediction.py
```

### Frontend Development
```bash
# Navigate to web directory
cd web

# Install dependencies
npm install

# Development server
npm run dev

# Build for production
npm run build

# Production server  
npm run start

# Lint code
npm run lint
```

### Deployment Scripts
```bash
# Initialize project setup
./setup.sh

# Deploy to GitHub (provide repo URL)
./deploy.sh https://github.com/username/repo.git
```

## Configuration System

### Currency Configs
- **configs/config.btc.yaml**: BTC prediction parameters
- **configs/config.eth.yaml**: ETH prediction parameters
- Key settings: symbol, timeframes, forecast horizon, model paths

### Environment Variables
Required for deployment:
```bash
# Cloudflare R2 Configuration
R2_ACCOUNT_ID=your_account_id
R2_ACCESS_KEY_ID=your_access_key_id  
R2_SECRET_ACCESS_KEY=your_secret_access_key
R2_BUCKET=kronos-prod
R2_PUBLIC_BASE=https://account_id.r2.cloudflarestorage.com/kronos-prod

# Optional: Binance API (fallback data source)
BINANCE_API_KEY=your_binance_api_key
BINANCE_SECRET_KEY=your_binance_secret_key
```

## Key Components

### Model System (`model/`)
- **kronos.py**: Core KronosTokenizer with BSQuantizer for data compression
- **module.py**: Transformer encoder/decoder blocks and attention mechanisms
- **Weights**: Downloaded from Hugging Face (NeoQuasar/Kronos-base, NeoQuasar/Kronos-Tokenizer-base)

### Data Pipeline (`core/`)
- **update_predictions.py**: Main prediction orchestrator
- **data_manager.py**: Caching, data retrieval with multiple source support
- **ccxt_data_source.py**: CCXT integration for real-time exchange data
- **realtime_data.py**: WebSocket and REST API data fetching
- **metrics_validator.py**: Data quality validation and error handling

### Web Components (`web/src/`)
- **components/InteractiveChart.tsx**: Main price/prediction chart with Recharts
- **components/MetricCard.tsx**: Individual metric display cards
- **services/dataSourceService.ts**: R2-first data loading with fallback
- **app/api/**: Next.js API routes for data retrieval (dashboard, prediction-data, historical-data)

### GitHub Actions (`.github/workflows/`)
- **publish-to-r2.yml**: Complete automation pipeline
  - Model download from R2
  - BTC/ETH prediction execution  
  - File preparation and R2 upload
  - Deployment verification

## Data Flow

```
CCXT APIs → Python Pipeline → ML Predictions → R2 Storage → Next.js Frontend → User Dashboard
     ↓              ↓              ↓             ↓              ↓
  Real-time      Model         JSON/PNG       CDN Cache    Interactive
   Market       Processing      Files         Delivery      Charts
```

## File Organization

### Input/Output Structure
```
predictions_raw/latest/     # Raw prediction outputs
records/                   # Latest prediction records (JSON)
web/public/data/          # Dashboard data files
web/public/               # Generated chart images
Kronos_model/             # Model weights (downloaded from R2)
```

### Configuration Hierarchy
1. **Global**: `configs/config.yaml` (if exists)
2. **Currency-specific**: `configs/config.btc.yaml`, `configs/config.eth.yaml`  
3. **Environment**: GitHub Secrets → Environment Variables
4. **Runtime**: Command-line arguments override config files

## Testing and Quality

### Python Testing
```bash
# Run predictions in test mode
python run_single.py --config configs/config.btc.yaml --test

# Validate data sources
python -c "from core.ccxt_data_source import CCXTDataSource; CCXTDataSource().test_connection()"
```

### Frontend Testing  
```bash
cd web
npm run lint           # ESLint validation
npm run type-check     # TypeScript type checking (if available)
```

### Deployment Validation
- GitHub Actions logs for prediction execution
- R2 bucket file verification 
- Cloudflare Pages build logs
- Browser network requests for data loading

## Common Development Patterns

### Adding New Cryptocurrency
1. Create `configs/config.newcoin.yaml` based on existing configs
2. Update GitHub Actions workflow to include new currency
3. Verify CCXT support for the trading pair
4. Test prediction pipeline locally before deployment

### Extending Prediction Horizon
1. Modify `forecast_horizon` in relevant config files
2. Update model input preparation logic
3. Adjust frontend chart display ranges  
4. Test memory usage for longer predictions

### Custom Metrics Integration
1. Extend `enhanced_metrics.py` with new calculations
2. Update `MetricCard` components for display
3. Modify API routes to serve additional metrics
4. Ensure R2 upload includes new metric files

## Monitoring and Troubleshooting

### Key Log Locations
- **GitHub Actions**: Repository Actions tab for execution logs
- **Cloudflare Pages**: Dashboard → Pages → Functions for build/runtime logs  
- **Python Errors**: Check Actions step outputs for model/prediction failures
- **Frontend Errors**: Browser Developer Tools console

### Common Issues
- **R2 Upload Failures**: Verify GitHub Secrets and R2 permissions
- **Model Download Issues**: Check model availability in R2 bucket
- **Data Source Errors**: CCXT API limits or network connectivity  
- **Chart Display Problems**: Verify data format consistency in JSON files

## Security Considerations

- Never commit API keys or secrets to the repository
- Use GitHub Secrets for all sensitive configuration
- R2 bucket uses public-read ACL only for generated output files  
- Model weights are downloaded from public R2 storage during CI
- Environment variables are properly scoped to prevent leakage

## Performance Optimization

- CCXT connection pooling and retry mechanisms
- Parquet format for efficient historical data caching
- R2 CDN caching with appropriate cache-control headers
- Next.js static generation where possible for dashboard components
- Compressed model weights using safetensors format