# CodePlanr Setup Guide

## 🚀 Quick Setup

### Option 1: Environment Variable (Recommended)

1. **Set your OpenAI API key as an environment variable:**
   
   **Windows (PowerShell):**
   ```powershell
   $env:OPENAI_API_KEY="your-api-key-here"
   ```
   
   **Windows (Command Prompt):**
   ```cmd
   set OPENAI_API_KEY=your-api-key-here
   ```
   
   **macOS/Linux:**
   ```bash
   export OPENAI_API_KEY="your-api-key-here"
   ```

2. **Add to your shell profile for persistence:**
   
   **Windows:** Add to your PowerShell profile or system environment variables
   **macOS/Linux:** Add to `~/.bashrc`, `~/.zshrc`, or `~/.profile`

### Option 2: VS Code Settings

1. Open VS Code Settings (`Ctrl+,`)
2. Search for "CodePlanr"
3. Set the "Openai Api Key" field with your API key

## 🎯 How to Use

### 1. Run the Extension

```bash
# Install dependencies
yarn install

# Compile the extension
yarn compile

# Press F5 in VS Code to run the extension
```

### 2. Open the Chat Interface

- Look for the **🤖 CodePlanr** icon in the Activity Bar (left sidebar)
- Click on it to open the AI Assistant panel
- Or use Command Palette: `CodePlanr: Open CodePlanr Chat`

### 3. Start Chatting!

Just type what you want to implement, for example:
- "Add user authentication to my app"
- "Create a new API endpoint for user profiles"
- "Implement dark mode toggle"
- "Add form validation to the contact form"

## 🎨 Features

### Chat Interface
- **Natural conversation** - Just describe what you want to build
- **File analysis** - Shows which files are being analyzed
- **Real-time feedback** - See what the AI is doing step by step
- **Interactive actions** - Click buttons to generate code or apply changes

### Smart Workspace Analysis
- **Automatic file scanning** - Finds relevant files based on your task
- **File highlighting** - Shows which files will be modified
- **Context awareness** - Understands your existing codebase

### Code Generation & Application
- **Step-by-step plans** - Detailed implementation steps
- **Code generation** - AI generates specific code for each step
- **Safe application** - Review changes before applying
- **File operations** - Create, modify, or delete files as needed

## 🔧 Configuration

### Environment Variables
- `OPENAI_API_KEY` - Your OpenAI API key (recommended)
- `OPENAI_MODEL` - Model to use (default: gpt-4o)

### VS Code Settings
- `CodePlanr.openaiApiKey` - API key (alternative to env var)
- `CodePlanr.model` - OpenAI model to use
- `CodePlanr.autoAnalyze` - Auto-analyze workspace on chat open

## 🐛 Troubleshooting

### API Key Issues
- Make sure your API key is valid and has sufficient credits
- Check that the environment variable is set correctly
- Verify the API key starts with `sk-`

### Extension Not Loading
- Make sure you're in the Extension Development Host window (opened with F5)
- Check the Developer Console for error messages
- Recompile the extension: `yarn compile`

### Chat Not Working
- Ensure you have a workspace open (not just a single file)
- Check that your OpenAI API key is configured
- Look for error messages in the chat interface

## 📝 Example Usage

### 1. Basic Task
```
You: "Add a login form to my React app"
AI: 🔍 Analyzing your workspace...
📁 Analyzing 12 relevant files: src/App.tsx, src/components/Login.tsx, src/services/auth.ts...
🤖 Generating AI coding plan...

## Add Login Form to React App

**Estimated Time:** 1-2 hours
**Difficulty:** Medium

### Steps:
1. **Create Login Component**
   - Create a new Login component with form fields
   - Files: src/components/Login.tsx

2. **Add Authentication Service**
   - Implement login API call
   - Files: src/services/auth.ts

3. **Update App Component**
   - Add login form to main app
   - Files: src/App.tsx

[🤖 Generate Code] [✅ Apply Changes]
```

### 2. Complex Task
```
You: "Create a full user management system with CRUD operations"
AI: 🔍 Analyzing your workspace...
📁 Analyzing 25 relevant files: src/models/User.ts, src/controllers/userController.ts...
🤖 Generating AI coding plan...

## Full User Management System

**Estimated Time:** 4-6 hours
**Difficulty:** Hard

### Steps:
1. **Database Models**
   - Create User model with validation
   - Files: src/models/User.ts, src/schemas/userSchema.ts

2. **API Endpoints**
   - Create CRUD endpoints for users
   - Files: src/controllers/userController.ts, src/routes/userRoutes.ts

3. **Frontend Components**
   - Create user list, create, edit, delete components
   - Files: src/components/UserList.tsx, src/components/UserForm.tsx

4. **Integration**
   - Connect frontend to backend
   - Files: src/services/userService.ts, src/App.tsx

[🤖 Generate Code] [✅ Apply Changes]
```

## 🎉 You're Ready!

The extension now works like GitHub Copilot but for planning and implementing entire features! Just chat with the AI about what you want to build, and it will analyze your workspace and generate a complete implementation plan.
