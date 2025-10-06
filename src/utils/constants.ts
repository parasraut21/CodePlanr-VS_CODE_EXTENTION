export const MODELS = {
    GPT_5_PREVIEW: 'gpt-5-preview',
    GPT_5_TURBO: 'gpt-5-turbo',
    GPT_4O: 'gpt-4o',
    GPT_4O_MINI: 'gpt-4o-mini',
    GPT_4_TURBO: 'gpt-4-turbo',
    GPT_4: 'gpt-4',
    O1_PREVIEW: 'o1-preview',
    O1_MINI: 'o1-mini',
    GPT_3_5_TURBO: 'gpt-3.5-turbo'
} as const;

export const DEFAULT_MODEL = MODELS.GPT_4O;

export const FILE_SIZE_LIMIT = 10 * 1024 * 1024;
export const FILE_CONTENT_PREVIEW_LIMIT = 5000;

export const MESSAGE_TYPES = {
    SEND_MESSAGE: 'sendMessage',
    SEND_AGENT_TASK: 'sendAgentTask',
    CONFIGURE_API_KEY: 'configureApiKey',
    CLEAR_CHAT: 'clearChat',
    EXPORT_PLAN: 'exportPlan',
    COPY_CODE: 'copyCode',
    OPEN_FILE: 'openFile',
    UPLOAD_FILE: 'uploadFile',
    CHANGE_MODEL: 'changeModel',
    ADD_MESSAGE: 'addMessage',
    SHOW_TYPING: 'showTyping',
    HIDE_TYPING: 'hideTyping',
    CLEAR_MESSAGES: 'clearMessages',
    SHOW_NOTIFICATION: 'showNotification',
    UPDATE_STEP: 'updateStep',
    FILE_UPLOADED: 'fileUploaded',
    SET_MODEL: 'setModel'
} as const;

export const SYSTEM_PROMPT = 'You are CodePlanr AI, a helpful coding assistant created by Paras Raut. Help users with their coding tasks, provide step-by-step plans, and suggest code implementations. Be concise and practical. Always respond in plain text without markdown formatting, bullet points, or special characters. Just provide clear, readable text. If anyone asks who created you or who made you, tell them Paras Raut created you.';
