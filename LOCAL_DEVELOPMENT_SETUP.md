# Local Development Setup - Avoiding CORS Issues

## The CORS Problem
When developing locally, you might be:
1. Opening HTML files directly (`file://` protocol)
2. Running frontend on one port (e.g., :3000) and backend on another (:8000)
3. Using `localhost` vs `127.0.0.1` inconsistently

## Solutions

### Option 1: Use a Local Web Server (Recommended)

Instead of opening files directly, serve them with a local web server:

```bash
# From the kawaii-quiz-app directory
cd kawaii-quiz-app

# Using Python (most systems have this)
python3 -m http.server 3000

# Or using Node.js
npx http-server -p 3000

# Or using PHP
php -S localhost:3000
```

Then access your app at: `http://localhost:3000`

### Option 2: Configure Frontend to Use Localhost

In `kawaii-quiz-app/src/scripts/dashboard.js`, temporarily change:

```javascript
// Line 78 - for local development
window.API_URL = 'http://localhost:8000';
```

### Option 3: Run Backend with Permissive CORS

The backend already has permissive CORS (`allow_origins=["*"]`), but you can make it even more permissive:

```bash
# Run the backend locally
cd backend
source venv/bin/activate  # or create venv if needed
python main.py
```

### Option 4: Use a Proxy Setup

Create a simple proxy that serves both frontend and backend:

```javascript
// proxy-server.js
const express = require('express');
const { createProxyMiddleware } = require('http-proxy-middleware');
const app = express();

// Serve frontend
app.use(express.static('kawaii-quiz-app'));

// Proxy API requests
app.use('/api', createProxyMiddleware({
  target: 'http://localhost:8000',
  changeOrigin: true,
}));

app.listen(3000, () => {
  console.log('Proxy server running on http://localhost:3000');
});
```

### Option 5: Browser Extension

For quick testing, you can use a CORS-disabling browser extension:
- Chrome: "CORS Unblock" or "Allow CORS"
- Firefox: "CORS Everywhere"

**Warning**: Only use for development, disable for normal browsing!

## Quick Start Commands

```bash
# Terminal 1 - Start Backend
cd backend
source venv/bin/activate
python main.py

# Terminal 2 - Start Frontend Server
cd kawaii-quiz-app
python3 -m http.server 3000

# Access at: http://localhost:3000
```

## Environment-Specific API URL

To automatically use the right API URL, update `dashboard.js`:

```javascript
// Detect if running locally
if (window.location.hostname === 'localhost' || 
    window.location.hostname === '127.0.0.1') {
    window.API_URL = 'http://localhost:8000';
} else {
    window.API_URL = 'https://p0qp0q.com';
}
```

This way, it automatically uses the local backend when developing!