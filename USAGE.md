# CodePlanr Usage Guide

## Quick Start

1. **Install Dependencies**
   ```bash
   yarn install
   ```

2. **Run the Extension**
   - Press `F5` in VS Code to open a new Extension Development Host window
   - The extension will be loaded in the new window

3. **Configure OpenAI API Key**
   - Open Command Palette (`Ctrl+Shift+P` / `Cmd+Shift+P`)
   - Run `CodePlanr: Configure API Key`
   - Enter your OpenAI API key

4. **Generate Your First Plan**
   - Open Command Palette (`Ctrl+Shift+P` / `Cmd+Shift+P`)
   - Run `CodePlanr: Generate AI Coding Plan`
   - Describe what you want to implement (e.g., "Add user login functionality")

## Example Tasks

Here are some example tasks you can try:

### Frontend Tasks
- "Add a dark mode toggle to the navigation bar"
- "Create a user profile page with edit functionality"
- "Implement a shopping cart with add/remove items"
- "Add form validation to the contact form"

### Backend Tasks
- "Create a REST API endpoint for user authentication"
- "Add database models for a blog system"
- "Implement file upload functionality"
- "Create a middleware for request logging"

### Full-Stack Tasks
- "Add user registration and login system"
- "Implement a real-time chat feature"
- "Create an admin dashboard"
- "Add email notification system"

## Understanding the Generated Plan

The AI will generate a plan with:

1. **Title & Description**: Overview of what will be implemented
2. **Estimated Time**: How long the task should take
3. **Difficulty Level**: Easy, Medium, or Hard
4. **Step-by-Step Instructions**: Detailed steps with:
   - Files that need to be created or modified
   - Clickable file links to open files in VS Code
   - "Generate Code" button to get AI-suggested code
   - "Apply Changes" button to implement changes

## Using the Interactive Features

### File Links
- Click on any file name to open it in VS Code
- Files are opened in the editor for easy navigation

### Generate Code
- Click "🤖 Generate Code" for any step
- The AI will analyze your current code and suggest specific changes
- Review the generated code before applying

### Apply Changes
- Click "✅ Apply Changes" to implement the suggested code
- Review all changes in the confirmation dialog
- Choose to apply all changes or review them individually

## Tips for Better Results

1. **Be Specific**: Instead of "Add authentication", try "Add JWT-based user authentication with login/logout endpoints"

2. **Provide Context**: Mention your tech stack (e.g., "Add React component for user dashboard" vs "Add user dashboard")

3. **Break Down Complex Tasks**: For large features, consider breaking them into smaller, focused tasks

4. **Review Generated Code**: Always review AI-generated code before applying to ensure it fits your project's patterns

## Troubleshooting

### Common Issues

**"OpenAI API key not configured"**
- Run `CodePlanr: Configure API Key` and enter your API key

**"Failed to generate plan"**
- Check your internet connection
- Verify your OpenAI API key is valid
- Ensure you have sufficient API credits

**"No workspace folder found"**
- Make sure you have a workspace open in VS Code
- The extension needs to scan your project files

**Generated code doesn't fit your project**
- The AI analyzes your existing code patterns
- If the generated code doesn't match, you can manually edit it
- Consider providing more context in your task description

### Getting Help

1. Check the VS Code Developer Console for error messages
2. Ensure your OpenAI API key is correctly configured
3. Verify you have sufficient OpenAI API credits
4. Open an issue on GitHub with detailed information

## Advanced Usage

### Customizing the AI Model
- Open VS Code Settings
- Search for "CodePlanr"
- Change the model setting (default: "gpt-4o")

### Working with Large Codebases
- The extension automatically limits file scanning to relevant files
- For very large projects, consider focusing on specific directories
- The AI will prioritize files that seem most relevant to your task

### Iterative Development
- Generate a plan for the overall feature
- Implement one step at a time
- Generate new plans for refinements or additional features
- Use the extension to iterate and improve your implementation
