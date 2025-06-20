# Visual Studio Code Setup Guide for JazzyPop

## 🚀 Getting Started with VS Code

### 1. Opening the Project
```bash
# Navigate to your project folder
cd /home/p0qp0q/Documents/Merlin/JazzyPop

# Open in VS Code (if you have the 'code' command installed)
code .

# Or open VS Code and use File → Open Folder
```

### 2. Essential VS Code Extensions

Install these extensions for the best development experience:

#### 🎯 Must-Have Extensions
1. **ESLint** (dbaeumer.vscode-eslint)
   - JavaScript linting and error checking
   - Install: Press `Ctrl+Shift+X`, search "ESLint"

2. **Prettier** (esbenp.prettier-vscode)
   - Code formatting
   - Install: Search "Prettier - Code formatter"

3. **Live Server** (ritwickdey.LiveServer)
   - Local development server with hot reload
   - Install: Search "Live Server"

4. **CSS Peek** (pranaygp.vscode-css-peek)
   - Jump to CSS definitions from HTML
   - Install: Search "CSS Peek"

5. **Auto Rename Tag** (formulahendry.auto-rename-tag)
   - Automatically rename paired HTML/XML tags
   - Install: Search "Auto Rename Tag"

#### 🎨 Helpful for CSS Development
6. **Color Highlight** (naumovs.color-highlight)
   - Highlights color codes in your CSS
   - Install: Search "Color Highlight"

7. **CSS Modules** (clinyong.vscode-css-modules)
   - CSS class name autocompletion
   - Install: Search "CSS Modules"

8. **IntelliSense for CSS** (Zignd.html-css-class-completion)
   - CSS class name completion
   - Install: Search "IntelliSense for CSS class names"

#### 🔧 JavaScript Development
9. **JavaScript (ES6) code snippets** (xabikos.JavaScriptSnippets)
   - Helpful code snippets
   - Install: Search "JavaScript (ES6) code snippets"

10. **Path Intellisense** (christian-kohler.path-intellisense)
    - Autocomplete file paths
    - Install: Search "Path Intellisense"

### 3. VS Code Settings

Create these configuration files in your project root:

#### `.vscode/settings.json` - Project-specific settings
```json
{
    // Editor settings
    "editor.fontSize": 14,
    "editor.tabSize": 4,
    "editor.insertSpaces": true,
    "editor.formatOnSave": true,
    "editor.codeActionsOnSave": {
        "source.fixAll.eslint": true
    },
    "editor.wordWrap": "on",
    "editor.minimap.enabled": true,
    "editor.bracketPairColorization.enabled": true,
    
    // File associations
    "files.associations": {
        "*.css": "css",
        "*.js": "javascript",
        "*.json": "json"
    },
    
    // Exclude files from explorer
    "files.exclude": {
        "**/.git": true,
        "**/.DS_Store": true,
        "**/node_modules": true,
        "**/dist": true
    },
    
    // Live Server settings
    "liveServer.settings.port": 5500,
    "liveServer.settings.root": "/",
    "liveServer.settings.CustomBrowser": "chrome",
    
    // CSS settings
    "css.validate": true,
    "css.lint.duplicateProperties": "warning",
    "css.lint.emptyRules": "warning",
    
    // JavaScript settings
    "javascript.updateImportsOnFileMove.enabled": "always",
    "javascript.suggest.autoImports": true,
    
    // Prettier settings
    "prettier.singleQuote": true,
    "prettier.trailingComma": "none",
    "prettier.tabWidth": 4,
    
    // Emmet for faster HTML/CSS
    "emmet.triggerExpansionOnTab": true,
    "emmet.includeLanguages": {
        "javascript": "javascriptreact"
    }
}
```

#### `.vscode/extensions.json` - Recommended extensions
```json
{
    "recommendations": [
        "dbaeumer.vscode-eslint",
        "esbenp.prettier-vscode",
        "ritwickdey.LiveServer",
        "pranaygp.vscode-css-peek",
        "formulahendry.auto-rename-tag",
        "naumovs.color-highlight",
        "Zignd.html-css-class-completion",
        "christian-kohler.path-intellisense",
        "xabikos.JavaScriptSnippets"
    ]
}
```

### 4. Project Structure in VS Code

Your project explorer should look like this:
```
JazzyPop/
├── .vscode/                 # VS Code settings
│   ├── settings.json
│   └── extensions.json
├── src/                     # Source code
│   ├── core/               # Core systems
│   │   ├── App.js
│   │   ├── BaseComponent.js
│   │   ├── EventBus.js
│   │   └── StateManager.js
│   ├── components/         # UI Components
│   ├── styles/            # CSS files
│   │   ├── main.css
│   │   ├── modes/         # Mode-specific styles
│   │   └── components/    # Component styles
│   └── utils/             # Utilities
├── assets/                 # Images, fonts, etc.
├── index.html             # Main HTML file
└── README.md              # Project documentation
```

### 5. CSS File Organization

Create this structure for your CSS:

#### `src/styles/main.css` - Main entry point
```css
/* Import all CSS modules */
@import './base/reset.css';
@import './base/variables.css';
@import './base/typography.css';
@import './base/utilities.css';

@import './layout/containers.css';
@import './layout/grid.css';

@import './modes/normal.css';
@import './modes/chaos.css';
@import './modes/zen.css';
@import './modes/speed.css';

@import './components/buttons.css';
@import './components/cards.css';
@import './components/quiz.css';
@import './components/navigation.css';

@import './animations/transitions.css';
@import './animations/keyframes.css';
```

### 6. VS Code Shortcuts for CSS Development

#### Essential Shortcuts
- `Ctrl+Space` - Trigger IntelliSense/autocomplete
- `Ctrl+/` - Toggle comment
- `Alt+Shift+F` - Format document
- `Ctrl+D` - Select next occurrence
- `Alt+Click` - Multiple cursors
- `Ctrl+Shift+L` - Select all occurrences
- `F2` - Rename symbol
- `Ctrl+P` - Quick file open
- `Ctrl+Shift+P` - Command palette

#### CSS-Specific Tips
1. **Emmet shortcuts** (type and press Tab):
   - `m10` → `margin: 10px;`
   - `p10-20` → `padding: 10px 20px;`
   - `bgc` → `background-color: ;`
   - `bd1-solid-black` → `border: 1px solid black;`

2. **Multi-cursor editing**:
   - Hold `Alt` and click to place multiple cursors
   - Select a CSS property and press `Ctrl+D` to select similar

3. **Color picker**:
   - Hover over any color value to see color picker
   - Click to open full picker

### 7. Live Development Workflow

1. **Start Live Server**:
   - Right-click on `index.html`
   - Select "Open with Live Server"
   - Your browser will open at `http://localhost:5500`

2. **Split View for CSS**:
   - Open your HTML file
   - `Ctrl+\` to split editor
   - Open CSS file in second pane
   - See changes live as you type!

3. **Browser DevTools Integration**:
   - Press `F12` in browser
   - Make CSS changes in DevTools
   - Copy changes back to VS Code

### 8. CSS Development Tips in VS Code

#### Use CSS Variables IntelliSense
```css
/* Type -- and VS Code will suggest your CSS variables */
.button {
    background: var(--); /* IntelliSense shows all variables */
}
```

#### Quick Documentation
- Hover over any CSS property to see documentation
- `Ctrl+Click` on classes to jump to definition

#### Fold/Unfold CSS Blocks
- Click the arrow next to line numbers
- `Ctrl+Shift+[` to fold
- `Ctrl+Shift+]` to unfold

### 9. Debugging CSS in VS Code

1. **CSS Lint Issues**:
   - Problems panel (`Ctrl+Shift+M`) shows CSS issues
   - Hover over squiggly lines for error details

2. **Format on Save**:
   - Already configured in settings
   - Just save and your CSS is formatted!

3. **Quick Fixes**:
   - Click lightbulb icon for CSS fixes
   - Or press `Ctrl+.` when cursor is on error

### 10. Git Integration (Bonus)

If you're using Git:
1. Source Control panel (`Ctrl+Shift+G`)
2. Stage changes with `+` button
3. Commit with checkmark
4. See file changes with color coding:
   - Green = Added
   - Blue = Modified
   - Red = Deleted

## 🎯 Quick Start for CSS Development

1. **Open VS Code** in JazzyPop folder
2. **Install recommended extensions** (popup will appear)
3. **Create CSS file structure** as shown above
4. **Start Live Server** (right-click index.html)
5. **Open main.css** and start coding!
6. **Use split view** to see HTML and CSS together
7. **Save to see changes** instantly in browser

## 🎨 CSS Mode Development Workflow

1. Create a new branch for CSS work:
   ```bash
   git checkout -b feature/four-modes-css
   ```

2. Open these files in tabs:
   - `index.html`
   - `src/styles/main.css`
   - `src/styles/modes/normal.css`
   - `src/styles/modes/chaos.css`

3. Use VS Code's preview:
   - Install "Preview on Web Server" extension
   - Split screen with preview on right

4. Test mode switching:
   - Open browser console
   - Type: `document.body.setAttribute('data-mode', 'chaos')`
   - See instant changes!

Happy coding! 🚀