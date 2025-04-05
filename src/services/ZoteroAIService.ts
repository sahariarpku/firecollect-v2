import { supabase } from '@/integrations/supabase/client';
import { Database } from '@/types/supabase';

type AIModel = Database['public']['Tables']['ai_models']['Row'];
type UserSettings = Database['public']['Tables']['user_settings']['Row'];

class ZoteroAIService {
  private static currentModel: AIModel | null = null;

  static async getCurrentModel(): Promise<AIModel | null> {
    if (this.currentModel) {
      return this.currentModel;
    }

    try {
      // Get current user
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        throw new Error('User not authenticated');
      }

      // Get user settings
      const { data: settings } = await (supabase
        .from('user_settings')
        .select('ai_model')
        .eq('user_id', user.id)
        .single() as unknown as Promise<{ data: { ai_model: string } | null }>);

      if (settings?.ai_model) {
        const { data: model } = await (supabase
          .from('ai_models')
          .select('*')
          .eq('id', settings.ai_model)
          .single() as unknown as Promise<{ data: AIModel | null }>);

        if (model) {
          this.currentModel = model;
          return model;
        }
      }

      // If no model is set, get the default one
      const { data: defaultModel } = await (supabase
        .from('ai_models')
        .select('*')
        .eq('is_default', true)
        .single() as unknown as Promise<{ data: AIModel | null }>);

      if (defaultModel) {
        this.currentModel = defaultModel;
        return defaultModel;
      }

      return null;
    } catch (error) {
      console.error('Error getting AI model:', error);
      return null;
    }
  }

  static async generateCompletion(
    userMessage: string,
    papers: any[]
  ): Promise<string> {
    try {
      const model = await this.getCurrentModel();
      if (!model) {
        throw new Error('No AI model configured');
      }

      // Create context from papers
      const papersContext = papers
        .map(paper => `Title: ${paper.title}
Authors: ${paper.authors}
Year: ${paper.year}
Abstract: ${paper.abstract}
DOI: ${paper.doi}
---`).join('\n');

      const systemPrompt = `You are a helpful research assistant. You have access to the following papers from the user's Zotero library. Use this information to answer questions about the papers, their content, and relationships between them. If you reference specific papers, include their titles in your response.

Available papers:
${papersContext}`;

      const messages = [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: userMessage }
      ];

      // Handle different AI providers
      switch (model.provider) {
        case 'openai':
          return await this.generateOpenAICompletion(model, messages);
        case 'anthropic':
          return await this.generateAnthropicCompletion(model, messages);
        case 'siliconflow':
          return await this.generateSiliconFlowCompletion(model, messages);
        case 'openrouter':
          return await this.generateOpenRouterCompletion(model, messages);
        case 'deepseek':
          return await this.generateDeepseekCompletion(model, messages);
        default:
          throw new Error(`Unsupported AI provider: ${model.provider}`);
      }
    } catch (error) {
      console.error('Error generating AI completion:', error);
      throw error;
    }
  }

  private static async generateOpenAICompletion(model: AIModel, messages: any[]): Promise<string> {
    const endpoint = `${model.base_url || 'https://api.openai.com/v1'}/chat/completions`;
    
    const response = await fetch(endpoint, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${model.api_key}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        model: model.model_name,
        messages,
        temperature: 0.7,
        max_tokens: 1000
      })
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error?.message || 'OpenAI API error');
    }

    const data = await response.json();
    return data.choices[0].message.content;
  }

  private static async generateAnthropicCompletion(model: AIModel, messages: any[]): Promise<string> {
    const endpoint = `${model.base_url || 'https://api.anthropic.com'}/v1/messages`;
    
    // Convert messages to Anthropic format
    const systemMessage = messages.find(m => m.role === 'system')?.content || '';
    const userMessage = messages.find(m => m.role === 'user')?.content || '';
    
    const response = await fetch(endpoint, {
      method: 'POST',
      headers: {
        'x-api-key': model.api_key,
        'anthropic-version': '2023-06-01',
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        model: model.model_name,
        messages: [
          {
            role: 'user',
            content: `${systemMessage}\n\nUser question: ${userMessage}`
          }
        ],
        max_tokens: 1000
      })
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error?.message || 'Anthropic API error');
    }

    const data = await response.json();
    return data.content[0].text;
  }

  private static async generateSiliconFlowCompletion(model: AIModel, messages: any[]): Promise<string> {
    const endpoint = `${model.base_url || 'https://api.siliconflow.cn/v1'}/chat/completions`;
    
    const response = await fetch(endpoint, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${model.api_key}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        model: model.model_name,
        messages,
        temperature: 0.7,
        max_tokens: 1000
      })
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error?.message || 'SiliconFlow API error');
    }

    const data = await response.json();
    return data.choices[0].message.content;
  }

  private static async generateOpenRouterCompletion(model: AIModel, messages: any[]): Promise<string> {
    const endpoint = `${model.base_url || 'https://openrouter.ai/api/v1'}/chat/completions`;
    
    const response = await fetch(endpoint, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${model.api_key}`,
        'Content-Type': 'application/json',
        'HTTP-Referer': window.location.origin,
        'X-Title': 'Zotero Research Assistant'
      },
      body: JSON.stringify({
        model: model.model_name,
        messages,
        temperature: 0.7,
        max_tokens: 1000
      })
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error?.message || 'OpenRouter API error');
    }

    const data = await response.json();
    return data.choices[0].message.content;
  }

  private static async generateDeepseekCompletion(model: AIModel, messages: any[]): Promise<string> {
    const endpoint = `${model.base_url || 'https://api.deepseek.com'}/v1/chat/completions`;
    
    const response = await fetch(endpoint, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${model.api_key}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        model: model.model_name || 'deepseek-chat',
        messages,
        temperature: 0.7,
        max_tokens: 1000,
        top_p: 0.7,
        frequency_penalty: 0.5
      })
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error?.message || 'DeepSeek API error');
    }

    const data = await response.json();
    return data.choices[0].message.content;
  }
}

export { ZoteroAIService }; 