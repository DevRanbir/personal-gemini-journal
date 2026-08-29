export interface StructuredAiResponse {
  response: string;
  userdata?: string[];
  action?: {
    todos?: Array<{ title: string; dueDate?: string }>;
    events?: Array<{ title: string; start?: string; end?: string }>;
    dataLog?: { addPoints?: string[]; deletePoints?: string[] };
  } | null;
}

export class GroqService {
  private static instance: GroqService;

  private constructor() {}

  public static getInstance(): GroqService {
    if (!GroqService.instance) {
      GroqService.instance = new GroqService();
    }
    return GroqService.instance;
  }

  /**
   * Send a message and get AI response via API route.
   */
  public async sendMessage(
    userId: string, 
    chatId: string, 
    message: string,
    previousMessages: { sender: string; text: string }[] = [],
    systemPrompt?: string
  ): Promise<StructuredAiResponse> {
    try {
      const response = await fetch('/api/chat/gemini', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          message,
          chatId,
          userId,
          previousMessages,
          systemPrompt,
        }),
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const data = await response.json();
      let cleanResponseText = data.response || 'Gemini returned an empty response.';

      if (typeof cleanResponseText === 'string' && cleanResponseText.trim().startsWith('{')) {
        try {
          const parsed = JSON.parse(cleanResponseText.trim());
          if (parsed && typeof parsed === 'object') {
            const inner = parsed.reply || parsed.response || parsed.message || parsed.text || parsed.answer;
            if (inner && typeof inner === 'string') {
              cleanResponseText = inner;
            }
          }
        } catch (e) {}
      }

      return {
        response: cleanResponseText,
        userdata: data.userdata || [],
        action: data.action || null,
      };
      
    } catch (error) {
      console.error('Error sending message to AI API:', error);
      return {
        response: 'Error processing response. Try again.',
        userdata: [],
        action: null,
      };
    }
  }

  /**
   * Get basic model information
   */
  public async getModelInfo(): Promise<{ name: string; description: string; maxTokens: number; temperature: number }> {
    return {
      name: 'llama-3.3-70b-versatile',
      description: 'Groq-hosted chat model',
      maxTokens: 1000,
      temperature: 0.7,
    };
  }
}

// Export a singleton instance
export const groqService = GroqService.getInstance();
