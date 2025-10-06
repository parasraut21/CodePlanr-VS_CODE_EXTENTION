export function getErrorMessage(error: unknown): string {
    if (error instanceof Error) {
        return error.message;
    }
    return 'Unknown error';
}

export function isAPIKeyError(errorMessage: string): boolean {
    return errorMessage.includes('401') || 
           errorMessage.includes('Unauthorized') || 
           errorMessage.includes('API key');
}

export function isRateLimitError(errorMessage: string): boolean {
    return errorMessage.includes('429');
}

export function isServerError(errorMessage: string): boolean {
    return errorMessage.includes('500') || 
           errorMessage.includes('502') || 
           errorMessage.includes('503');
}

export function isNotCodingTask(errorMessage: string): boolean {
    return errorMessage.includes('NOT_A_CODING_TASK');
}

export function formatErrorMessage(errorMessage: string): string {
    if (isNotCodingTask(errorMessage)) {
        return '💬 Not a Coding Task\n\nI\'m designed to help with coding tasks like:\n• Creating files\n• Writing code\n• Modifying existing code\n• Checking for errors\n\nFor general questions, switch to 💬 Chat mode!\n\nExamples:\n• "create a python file for sorting"\n• "make a javascript function for validation"\n• "create a cpp file for addition"';
    }
    
    if (isAPIKeyError(errorMessage)) {
        return '🔑 Invalid API Key\n\nYour OpenAI API key is invalid or expired.\n\nPlease:\n1. Click the ⚙️ Settings button above\n2. Get a valid API key from https://platform.openai.com/api-keys\n3. Enter the new key\n4. Try again';
    }
    
    if (isRateLimitError(errorMessage)) {
        return '⏰ Rate Limit Exceeded\n\nYou have exceeded the OpenAI API rate limit.\n\nPlease wait a moment and try again.';
    }
    
    if (isServerError(errorMessage)) {
        return '🌐 Server Error\n\nOpenAI servers are experiencing issues.\n\nPlease try again in a few minutes.';
    }
    
    return `❌ Error: ${errorMessage}\n\nIf this is an API key issue, click ⚙️ Settings to configure your key.`;
}
