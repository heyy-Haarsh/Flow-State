# FlowState ⚡ — AI-Powered Smart Task & Energy Manager

> Work smarter by working with your natural rhythms, not against them.

## 🎯 What is FlowState?

FlowState is a **privacy-first** desktop productivity app that:
1. Monitors typing speed, error rates, and work patterns (NO keystroke content)
2. Predicts your cognitive energy level (0-100) in real-time using ML
3. Uses Week 1 questionnaires to train a **personalized** ML model
4. Suggests the right tasks at the right time based on energy predictions
5. Prevents burnout with smart break interventions

## 🛠️ Tech Stack

| Layer | Technology |
|-------|-----------|
| Desktop Framework | Electron |
| UI | React 18+ with TailwindCSS |
| State Management | Zustand |
| Charts | Recharts |
| Database | SQLite (better-sqlite3) |
| ML Training | Python (LightGBM + scikit-learn) |
| ML Inference | ONNX Runtime for Node.js |
| Icons | Lucide React |

## 📁 Project Structure

```
flowstate/
├── main/           # Electron Main Process
├── ml-service/     # Python ML Training Service
├── src/            # React Frontend
└── public/         # Static Assets
```

## 🚀 Getting Started

### Prerequisites
- Node.js 18+
- Python 3.9+
- npm or yarn

### Installation

```bash
# Install Node dependencies
npm install

# Install Python ML service dependencies
cd ml-service
pip install -r requirements.txt
cd ..
```

### Development

```bash
# Start the app in development mode
npm run dev
```

### Building

```bash
npm run build
```

## 🔐 Privacy

- ✅ All data stays **100% local** on your device
- ✅ Only typing speed & error rates — **never** what you type
- ✅ You control data retention (7/30/90 days or forever)
- ✅ Export or delete your data anytime
- ❌ No cloud sync, no telemetry, no keystroke content

## 📋 Week 1 Calibration

During your first 7 days, FlowState asks simple morning questions to learn YOUR unique energy patterns. After Day 7, it trains a personalized AI model and can predict your energy levels in real-time without questionnaires.

## 📄 License

MIT
