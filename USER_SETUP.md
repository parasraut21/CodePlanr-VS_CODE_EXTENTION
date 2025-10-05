# 🔑 CodePlanr API Key Setup Guide

## How Users Set Up Their API Key

When users install your CodePlanr extension, they need to provide their own OpenAI API key. Here's how:

### Method 1: Environment Variable (Recommended)

**Windows:**
```powershell
# Set for current session
$env:OPENAI_API_KEY="sk-your-api-key-here"

# Set permanently (restart VS Code after this)
[Environment]::SetEnvironmentVariable("OPENAI_API_KEY", "sk-your-api-key-here", "User")
```

**macOS/Linux:**
```bash
# Add to your shell profile (~/.bashrc, ~/.zshrc, etc.)
export OPENAI_API_KEY="sk-your-api-key-here"
```

### Method 2: VS Code Settings

1. **Open VS Code Settings:** `Ctrl+,` (or `Cmd+,` on Mac)
2. **Search for "CodePlanr"**
3. **Find "CodePlanr: Openai Api Key"**
4. **Enter your API key**

### Method 3: Workspace .env File

1. **Create `.env` file in your project root:**
```bash
echo OPENAI_API_KEY=sk-your-api-key-here > .env
```

2. **Restart VS Code**

## 🔐 Security Best Practices

### ✅ DO:
- Use your own OpenAI API key
- Keep your API key secret
- Use environment variables when possible
- Set up billing limits on your OpenAI account

### ❌ DON'T:
- Share your API key with others
- Commit API keys to version control
- Use someone else's API key
- Ignore OpenAI usage limits

## 🎯 How to Get an API Key

1. **Go to OpenAI Platform:** https://platform.openai.com/api-keys
2. **Sign in or create account**
3. **Click "Create new secret key"**
4. **Copy the key** (starts with `sk-`)
5. **Set up billing** (required for API usage)

## 💰 Cost Information

- **GPT-4o:** ~$0.01-0.03 per request (varies by length)
- **Typical usage:** $1-5 per month for regular use
- **Set up usage limits** in your OpenAI account
- **Monitor usage** in the OpenAI dashboard

## 🚀 Using the Extension

1. **Install CodePlanr** from VS Code Marketplace
2. **Set up your API key** using any method above
3. **Open the chat panel** (🤖 CodePlanr icon in Activity Bar)
4. **Start chatting** about what you want to build!

## 🆘 Troubleshooting

### "API key not configured"
- Check your environment variable: `echo $OPENAI_API_KEY`
- Verify VS Code settings
- Restart VS Code after setting environment variables

### "401 Unauthorized"
- Your API key is invalid or expired
- Get a new API key from OpenAI
- Check your OpenAI account billing

### "Insufficient credits"
- Add payment method to your OpenAI account
- Check your usage limits
- Monitor your API usage

## 🎉 You're Ready!

Once you have your API key set up, CodePlanr will:
- Analyze your workspace automatically
- Generate detailed coding plans
- Show which files will be modified
- Help you implement features step by step

Happy coding! 🚀
