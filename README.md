# JazzyPop 🎵 (Kawaii Quiz App)

A mobile-friendly quiz creator for Adobe Learning Manager (ALM) with a delightful kawaii aesthetic. Create engaging quizzes with AI assistance and beautiful animations!

![Version](https://img.shields.io/badge/version-4.4-pink.svg)
![License](https://img.shields.io/badge/license-MIT-blue.svg)

## 🌸 Features

- **Kawaii Design**: Beautiful, playful interface with emoji icons and smooth animations
- **AI-Powered**: Generate quiz questions automatically using Claude AI
- **ALM Integration**: Works as a native extension within Adobe Learning Manager
- **Mobile-First**: Responsive design optimized for phones and tablets
- **Dual Mode**: 
  - Instructor mode for creating quizzes
  - Learner mode for taking quizzes
- **Single Answer Questions**: Clean, modern button-based answers
- **Real-time Saving**: Quizzes are automatically saved to the backend

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

## 🐛 Known Issues

See our [Issues](https://github.com/yourusername/JazzyPop/issues) page, particularly:
- [#1: ALM Native Extension API Authentication](https://github.com/yourusername/JazzyPop/issues/1)

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