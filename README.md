# 🤖 CodePlanr AI

Simple AI coding assistant with chat sidebar. Just talk to it and it creates files for you.

## How to Use

1. **Press F5** to run the extension
2. **Click the 🤖 robot icon** in the left sidebar
3. **Click ⚙️ Config** button and enter your OpenAI API key
4. **Start chatting!**

<<<<<<< HEAD
## What It Does

### Ask Questions
```
"How do I create a REST API?"
"Explain async/await"
"Help me debug this code"
```

### Create Files
```
"Create a C++ file for addition of 2 numbers"
"Make a Python script to read CSV"
"Create a JavaScript email validator"
```

The AI automatically:
- Creates the file
- Writes the code
- Opens it in your editor

## Get API Key

1. Go to https://platform.openai.com/api-keys
2. Sign up/login
3. Create new key
4. Copy and paste in Config

## That's It!

No complicated setup. Just chat and create files.

---

Made by Paras Raut
=======
## Getting Started

### Prerequisites

- VS Code 1.104.0 or higher
- OpenAI API key (get one from [OpenAI](https://platform.openai.com/api-keys))

### Installation

1. Clone this repository
2. Run `yarn install` to install dependencies
3. Press `F5` to run the extension in a new Extension Development Host window

### Configuration

1. Open the Command Palette (`Ctrl+Shift+P` / `Cmd+Shift+P`)
2. Run `CodePlanr: Configure API Key`
3. Enter your OpenAI API key when prompted

## Usage

### Generate a Coding Plan

1. Open the Command Palette (`Ctrl+Shift+P` / `Cmd+Shift+P`)
2. Run `CodePlanr: Generate AI Coding Plan`
3. Describe what you want to implement (e.g., "Add user authentication", "Create a new API endpoint")
4. The extension will scan your workspace and generate a detailed plan

### Apply Code Changes

1. In the generated plan, click "🤖 Generate Code" for any step
2. Review the suggested changes in the preview
3. Click "✅ Apply Changes" to implement the changes
4. Confirm the changes in the review dialog

## Commands

- `CodePlanr: Generate AI Coding Plan` - Create a new coding plan from a task description
- `CodePlanr: Apply AI Suggested Changes` - Apply generated code changes
- `CodePlanr: Configure API Key` - Set up your OpenAI API key

## Extension Settings

This extension contributes the following settings:

- `CodePlanr.openaiApiKey`: OpenAI API Key for CodePlanr AI features
- `CodePlanr.model`: OpenAI model to use for code generation (default: "gpt-4o")

## How It Works

1. **Task Input**: You describe what you want to implement
2. **Workspace Analysis**: The extension scans your workspace for relevant files
3. **AI Planning**: OpenAI analyzes your codebase and generates a detailed plan
4. **Interactive Display**: The plan is shown in a beautiful webview with clickable elements
5. **Code Generation**: For each step, you can generate specific code changes
6. **Safe Application**: Changes are applied with your confirmation and detailed review

## Architecture

The extension is built with a modular architecture:

- **OpenAI Service**: Handles AI interactions and code generation
- **Workspace Scanner**: Analyzes workspace files and determines relevance
- **Plan Generator**: Combines workspace analysis with AI planning
- **Markdown Viewer**: Displays plans in an interactive webview
- **Code Applier**: Safely applies changes with user confirmation

## Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Add tests if applicable
5. Submit a pull request

## License

MIT License - see LICENSE file for details

## Support

If you encounter any issues or have questions:

1. Check the VS Code Developer Console for error messages
2. Ensure your OpenAI API key is correctly configured
3. Verify you have sufficient OpenAI API credits
4. Open an issue on GitHub with detailed information

---

Built with ❤️ for the VS Code community
>>>>>>> 7f229e66db17080657041b106c7d56905537b054
