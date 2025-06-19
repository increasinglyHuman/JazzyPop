# JazzyPop 🎵 (Kawaii Quiz App)

A mobile-friendly quiz creator for Adobe Learning Manager (ALM) with a delightful kawaii aesthetic. Create engaging quizzes with AI assistance and beautiful animations!

![Version](https://img.shields.io/badge/version-4.8-pink.svg)
![License](https://img.shields.io/badge/license-MIT-blue.svg)

## 🌸 Features

- **Kawaii Design**: Beautiful, playful interface with emoji icons and smooth animations
- **AI-Powered**: Generate quiz questions automatically using Claude AI
- **ALM Integration**: Works as a native extension within Adobe Learning Manager
- **Mobile-First**: Responsive design optimized for phones and tablets
- **Quiz Hub**: Innovative sidebar mode with daily challenges and universal quizzes
- **Dual Mode**: 
  - Instructor mode for creating quizzes
  - Learner mode for taking quizzes
- **Single Answer Questions**: Clean, modern button-based answers
- **Real-time Saving**: Quizzes are automatically saved to the backend
- **OAuth Authentication**: Secure API integration with role-based access

## 🚀 Quick Start

### Prerequisites

- Node.js 18+
- npm or yarn
- Adobe Learning Manager account with native extension permissions
- Anthropic API key for AI features

### Installation

1. Clone the repository:
```bash
git clone https://github.com/yourusername/JazzyPop.git
cd JazzyPop
```

2. Install frontend dependencies:
```bash
cd kawaii-quiz-app
npm install
```

3. Install backend dependencies:
```bash
cd ../kawaii-quiz-backend
npm install
```

4. Configure environment variables:
```bash
cp .env.example .env
# Edit .env with your configuration
```

### Running Locally

1. Start the backend server:
```bash
cd kawaii-quiz-backend
npm start
```

2. Serve the frontend (in a new terminal):
```bash
cd kawaii-quiz-app
python3 -m http.server 8080
```

3. Access the app at `http://localhost:8080`

## 🔐 ALM Authentication Update

**Important Discovery**: Native extensions receive `natext_` tokens which cannot be used with ALM's public API. For API access:

1. Register your app in ALM Integration Admin
2. Generate OAuth tokens using [Adobe's Token Tool](https://learningmanager.adobe.com/apidocs)
3. Follow our [OAuth Setup Guide](docs/OAUTH_SETUP_GUIDE.md)

See [ALM Integration Guide](docs/ALM_INTEGRATION.md) for the full solution.

## 🏗️ Architecture

```
JazzyPop/
├── kawaii-quiz-app/        # Frontend (Vanilla JS)
│   ├── index.html
│   ├── app.js             # Main application logic
│   └── styles.css         # Kawaii styling
├── kawaii-quiz-backend/    # Backend (Node.js/Express)
│   ├── server-simple.js   # Express server with API routes
│   ├── ai-integration.js  # Claude AI integration
│   └── data/             # JSON quiz storage
└── docs/                  # Documentation
```

## 🎨 Design Philosophy

- **Kawaii Aesthetic**: Soft gradients, rounded corners, playful animations
- **Accessibility**: High contrast text, large touch targets
- **Simplicity**: Clean UI without clutter, single-answer questions only
- **Modern**: No radio buttons or checkboxes - just beautiful buttons

## 📊 Current Status

See our [Status Update](STATUS_UPDATE.md) for the latest development progress and current investigations.

## 🐛 Known Issues

See our [Issues](https://github.com/increasinglyHuman/JazzyPop/issues) page, particularly:
- [#1: ALM Native Extension API Authentication](https://github.com/increasinglyHuman/JazzyPop/issues/1) - ✅ Resolved with OAuth
- [#2: Learner Sidebar Extension Loading](https://github.com/increasinglyHuman/JazzyPop/issues/2) - 🔍 Under investigation

## 👥 Development Team

- **p0qp0q** - Project Lead & Frontend Development
- **Claude (Anthropic)** - Architecture & Implementation

## 📝 License

MIT License - see [LICENSE](LICENSE) file for details

## 🤝 Contributing

Contributions are welcome! Please read our [Contributing Guidelines](CONTRIBUTING.md) first.

## 📞 Support

For ALM integration issues, please contact Adobe Learning Manager support.
For other issues, please open a GitHub issue.