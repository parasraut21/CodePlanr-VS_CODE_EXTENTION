# Traycer-Lite VS Code Extension

A simplified, beginner-friendly VS Code extension that acts as a planning layer for coding tasks. Built on top of the existing CodePlanr AI extension, it provides structured planning and execution capabilities.

## Features

### 🤖 Agent Selection
Choose from specialized AI agents:
- **General** 🤖 - General purpose development assistance
- **Frontend** 🎨 - React, Vue, Angular, HTML/CSS, JavaScript/TypeScript
- **Backend** ⚙️ - Node.js, Express, API development, database integration
- **Full Stack** 🚀 - Both frontend and backend development
- **DevOps** 🐳 - Deployment, CI/CD, Docker, infrastructure

### 📋 Planning Commands
- `traycer.plan` - Generate a structured plan for any coding task
- `traycer.execute` - Execute the generated plan step by step

### 🎯 How It Works

1. **Generate Plan**: Use `Ctrl+Shift+P` → "Traycer: Generate Plan"
   - Enter your task (e.g., "Add login route to Express app")
   - Select an appropriate agent
   - Get a structured JSON plan with clear steps

2. **Execute Plan**: Use `Ctrl+Shift+P` → "Traycer: Execute Plan"
   - Review the generated plan
   - Confirm execution
   - Watch as the AI applies changes to your files

### 🔧 Technical Implementation

- **Plan Format**: JSON structure with task description and step-by-step actions
- **File Operations**: Uses VS Code APIs for safe file editing
- **Agent Specialization**: Different AI prompts for different development domains
- **Output Channel**: Real-time feedback in VS Code's output panel

### 📝 Example Plan Structure

```json
{
  "task": "Add login route to Express app",
  "steps": [
    {
      "id": 1,
      "description": "Create authentication middleware",
      "file": "src/middleware/auth.js",
      "action": "create"
    },
    {
      "id": 2,
      "description": "Add login route handler",
      "file": "src/routes/auth.js",
      "action": "add"
    },
    {
      "id": 3,
      "description": "Update main app to use auth routes",
      "file": "src/app.js",
      "action": "edit"
    }
  ]
}
```

### 🚀 Getting Started

1. **Configure API Key**: 
   - Set `OPENAI_API_KEY` environment variable, or
   - Use `Ctrl+Shift+P` → "CodePlanr: Configure OpenAI API Key"

2. **Generate Your First Plan**:
   - Open a project in VS Code
   - Use `Ctrl+Shift+P` → "Traycer: Generate Plan"
   - Enter a task like "Add user authentication"
   - Select an appropriate agent
   - Review the generated plan

3. **Execute the Plan**:
   - Use `Ctrl+Shift+P` → "Traycer: Execute Plan"
   - Confirm the changes
   - Watch the magic happen!

### 🎨 UI Features

- **Agent Dropdown**: Select specialized agents directly in the chat interface
- **Real-time Feedback**: See plan generation and execution progress
- **Safe Execution**: Confirmation dialogs before making changes
- **Output Logging**: Detailed logs in VS Code's output channel

### 🔒 Safety Features

- **Confirmation Dialogs**: Always confirm before executing plans
- **File Backup**: Changes are made safely using VS Code APIs
- **Error Handling**: Graceful error handling with user feedback
- **Plan Review**: Review generated plans before execution

### 📊 Benefits Over Traycer

- **Simplicity**: No complex agent swarm, just one LLM + VS Code APIs
- **Usability**: Plan and execute from VS Code's command palette
- **Transparency**: Clear output logs make debugging transparent
- **Integration**: Native VS Code experience with familiar workflows

## Development

Built with TypeScript, using VS Code's extension APIs for file operations and UI integration. The extension reuses the existing CodePlanr AI infrastructure while adding structured planning capabilities.

### Key Files

- `src/providers/TraycerProvider.ts` - Core planning and execution logic
- `src/extension.ts` - Command registration and integration
- `src/providers/CodePlanrProvider.ts` - Enhanced with agent selection UI

### Commands

- `traycer.plan` - Generate structured plans
- `traycer.execute` - Execute generated plans
- `CodePlanr.configureApiKey` - Configure OpenAI API key

---

**Created by Paras Raut** - A simplified approach to AI-powered coding assistance in VS Code.
