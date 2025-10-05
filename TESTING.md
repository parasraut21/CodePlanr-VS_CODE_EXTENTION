# CodePlanr Testing Guide

## 🚀 How to Test the Extension

### Step 1: Set Up API Key

**Option A: Create .env file**
```bash
# Create .env file in project root
echo OPENAI_API_KEY=sk-your-actual-api-key-here > .env
```

**Option B: Use environment variable**
```powershell
# Windows PowerShell
$env:OPENAI_API_KEY="sk-your-actual-api-key-here"
```

### Step 2: Run the Extension

1. **Open VS Code** in the CodePlanr project folder
2. **Press F5** to run the extension in Extension Development Host
3. **Look for the 🤖 CodePlanr icon** in the Activity Bar (left sidebar)
4. **Click the icon** to open the AI Assistant panel

### Step 3: Test the Chat Interface

1. **Open a workspace** with some code files
2. **In the chat panel**, type: "Add user authentication to my app"
3. **Watch the AI:**
   - Analyze your workspace files
   - Show which files it's working with
   - Generate a detailed plan
   - Provide action buttons

### Step 4: Test Commands

**Command Palette Test:**
1. Press `Ctrl+Shift+P` (or `Cmd+Shift+P` on Mac)
2. Type "CodePlanr"
3. You should see:
   - `CodePlanr: Open CodePlanr Chat`
   - `CodePlanr: Generate AI Coding Plan`
   - `CodePlanr: Apply AI Suggested Changes`

### Step 5: Test API Key Detection

**Check if API key is loaded:**
1. Open Developer Console: `Help → Toggle Developer Tools`
2. Look for: `CodePlanr: Using OpenAI API key from environment variable`
3. If you see an error, check your API key setup

## 🐛 Troubleshooting

### "No data provider registered" Error

**This should be fixed now!** If you still see this error:

1. **Restart the Extension Development Host:**
   - Close the Extension Development Host window
   - Press F5 again to restart

2. **Check the package.json structure:**
   - Make sure `viewsContainers` comes before `views`
   - Verify the view ID matches: `codePlanrChat`

3. **Recompile the extension:**
   ```bash
   yarn compile
   ```

### API Key Not Found

**Check your setup:**
1. **Environment variable:**
   ```powershell
   echo $env:OPENAI_API_KEY
   ```

2. **Check .env file:**
   ```bash
   type .env
   ```

3. **VS Code settings:**
   - Press `Ctrl+,`
   - Search for "CodePlanr"
   - Check if API key is set there

### Chat Panel Not Showing

**Make sure:**
1. You're in the **Extension Development Host** window (not the original VS Code)
2. You have a **workspace open** (not just a single file)
3. The **🤖 CodePlanr icon** is visible in the Activity Bar

### Extension Not Loading

**Check:**
1. **Compilation errors:**
   ```bash
   yarn compile
   ```

2. **Developer Console:**
   - `Help → Toggle Developer Tools`
   - Look for error messages in Console tab

3. **Extension Host logs:**
   - `Help → Toggle Developer Tools`
   - Go to Console tab
   - Look for "CodePlanr" messages

## ✅ Success Indicators

**You'll know it's working when:**

1. **🤖 CodePlanr icon appears** in the Activity Bar
2. **Chat panel opens** when you click the icon
3. **API key is detected** (check Developer Console)
4. **Commands appear** in Command Palette
5. **Chat responds** to your messages
6. **File analysis works** (shows which files are being analyzed)

## 🎯 Test Scenarios

### Basic Chat Test
```
You: "Hello"
Expected: AI responds with welcome message
```

### Workspace Analysis Test
```
You: "Add a login form"
Expected: 
- Shows "🔍 Analyzing your workspace..."
- Lists files being analyzed
- Generates a plan with steps
```

### Code Generation Test
```
You: "Create a user model"
Expected:
- Shows plan with file suggestions
- Provides "🤖 Generate Code" button
- Shows generated code when clicked
```

### File Operations Test
```
You: "Add authentication to my app"
Expected:
- Analyzes existing files
- Shows which files will be modified
- Provides "✅ Apply Changes" button
- Shows file changes in review dialog
```

## 🎉 You're Ready!

If all tests pass, your CodePlanr extension is working perfectly! You can now:

- **Chat with AI** about coding tasks
- **Analyze your workspace** automatically
- **Generate detailed plans** with file references
- **Apply code changes** safely with confirmation
- **Use environment variables** for API key management

Happy coding! 🚀
