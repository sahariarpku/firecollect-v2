import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

interface AIModel {
  id: string;
  name: string;
  provider: string;
  model_name: string;
  api_key: string;
  base_url: string | null;
  is_default: boolean;
  created_at: string;
  updated_at: string;
  user_id: string | null;
}

interface AIModelInput {
  name: string;
  provider: string;
  model_name: string;
  api_key: string;
  base_url?: string;
  is_default?: boolean;
  user_id?: string | null;
}

interface DatabaseAIModel {
  id: string;
  name: string;
  provider: string;
  model_name: string;
  api_key: string;
  base_url: string | null;
  is_default: boolean;
  created_at: string;
  updated_at: string;
  user_id: string | null;
}

export type AIProvider = 'openai' | 'google' | 'anthropic' | 'deepseek' | 'openrouter' | 'siliconflow';

export interface AIModelUpdateInput {
  name?: string;
  provider?: AIProvider;
  api_key?: string;
  base_url?: string;
  model_name?: string;
  is_default?: boolean;
}

export class AIService {
  /**
   * Fetch all saved AI models
   */
  static async getModels(): Promise<AIModel[]> {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        console.error('User not authenticated');
        return [];
      }

      const { data, error } = await supabase
        .from('ai_models')
        .select('*')
        .eq('user_id', user.id)
        .order('is_default', { ascending: false })
        .order('created_at', { ascending: false });
        
      if (error) {
        console.error('Error fetching AI models:', error);
        throw error;
      }
      
      if (!data) {
        return [];
      }

      return (data as DatabaseAIModel[]).map(item => ({
        id: item.id,
        name: item.name,
        provider: item.provider,
        api_key: item.api_key,
        base_url: item.base_url,
        model_name: item.model_name,
        is_default: item.is_default,
        created_at: item.created_at,
        updated_at: item.updated_at,
        user_id: item.user_id
      }));
    } catch (error) {
      console.error('Error in getModels:', error);
      return [];
    }
  }
  
  /**
   * Get the default AI model
   */
  static async getDefaultModel(): Promise<AIModel | null> {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        console.error('User not authenticated');
        return null;
      }

      const { data, error } = await supabase
        .from('ai_models')
        .select('*')
        .eq('user_id', user.id)
        .eq('is_default', true)
        .maybeSingle();
        
      if (error) {
        console.error('Error fetching default AI model:', error);
        throw error;
      }
      
      if (!data) {
        return null;
      }

      const model = data as DatabaseAIModel;
      return {
        id: model.id,
        name: model.name,
        provider: model.provider,
        api_key: model.api_key,
        base_url: model.base_url,
        model_name: model.model_name,
        is_default: model.is_default,
        created_at: model.created_at,
        updated_at: model.updated_at,
        user_id: model.user_id
      };
    } catch (error) {
      console.error('Error in getDefaultModel:', error);
      return null;
    }
  }
  
  /**
   * Add a new AI model
   */
  static async addModel(model: AIModelInput): Promise<AIModel | null> {
    try {
      // Get current user
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        throw new Error('User not authenticated');
      }

      // If this is set as default, first unset other defaults
      if (model.name.toLowerCase().includes('default') || !await this.hasDefaultModel()) {
        await this.clearDefaultModels();
        
        const { data, error } = await supabase
          .from('ai_models')
          .insert({
            ...model,
            is_default: true,
            user_id: user.id
          })
          .select()
          .single();
          
        if (error) {
          console.error('Error adding AI model:', error);
          throw error;
        }
        
        return data;
      } else {
        const { data, error } = await supabase
          .from('ai_models')
          .insert({
            ...model,
            user_id: user.id
          })
          .select()
          .single();
          
        if (error) {
          console.error('Error adding AI model:', error);
          throw error;
        }
        
        return data;
      }
    } catch (error) {
      console.error('Error in addModel:', error);
      return null;
    }
  }
  
  /**
   * Update an existing AI model
   */
  static async updateModel(id: string, model: AIModelUpdateInput): Promise<AIModel | null> {
    try {
      const { data, error } = await supabase
        .from('ai_models')
        .update({
          ...model,
          updated_at: new Date().toISOString()
        })
        .eq('id', id)
        .select()
        .single();
        
      if (error) {
        console.error('Error updating AI model:', error);
        throw error;
      }
      
      return data;
    } catch (error) {
      console.error('Error in updateModel:', error);
      return null;
    }
  }
  
  /**
   * Delete an AI model
   */
  static async deleteModel(id: string): Promise<boolean> {
    try {
      // Get current user
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        throw new Error('User not authenticated');
      }

      // First verify the model belongs to the user
      const { data: model, error: fetchError } = await supabase
        .from('ai_models')
        .select('id, user_id')
        .eq('id', id)
        .single();

      if (fetchError) {
        throw new Error('Failed to fetch model details');
      }

      if (!model) {
        throw new Error('Model not found');
      }

      // Type assertion for the model data
      const modelData = model as { id: string; user_id: string | null };
      if (modelData.user_id !== user.id) {
        throw new Error('You do not have permission to delete this model');
      }

      // Delete the model
      const { error: deleteError } = await supabase
        .from('ai_models')
        .delete()
        .eq('id', id)
        .eq('user_id', user.id);

      if (deleteError) {
        throw deleteError;
      }
      
      return true;
    } catch (error) {
      console.error('Error in deleteModel:', error);
      throw error;
    }
  }
  
  /**
   * Set a model as the default
   */
  static async setAsDefault(id: string): Promise<boolean> {
    try {
      // First, clear all defaults
      await this.clearDefaultModels();
      
      // Then set this one as default
      const { error } = await supabase
        .from('ai_models')
        .update({ is_default: true, updated_at: new Date().toISOString() })
        .eq('id', id);
        
      if (error) {
        console.error('Error setting model as default:', error);
        throw error;
      }
      
      return true;
    } catch (error) {
      console.error('Error in setAsDefault:', error);
      return false;
    }
  }
  
  /**
   * Check if has any default model
   */
  static async hasDefaultModel(): Promise<boolean> {
    try {
      const { count, error } = await supabase
        .from('ai_models')
        .select('*', { count: 'exact', head: true })
        .eq('is_default', true);
        
      if (error) {
        console.error('Error checking for default models:', error);
        throw error;
      }
      
      return count !== null && count > 0;
    } catch (error) {
      console.error('Error in hasDefaultModel:', error);
      return false;
    }
  }
  
  /**
   * Clear all default models
   */
  static async clearDefaultModels(): Promise<boolean> {
    try {
      const { error } = await supabase
        .from('ai_models')
        .update({ is_default: false, updated_at: new Date().toISOString() })
        .eq('is_default', true);
        
      if (error) {
        console.error('Error clearing default models:', error);
        throw error;
      }
      
      return true;
    } catch (error) {
      console.error('Error in clearDefaultModels:', error);
      return false;
    }
  }
  
  /**
   * Test connection to an AI model
   */
  static async testConnection(model: AIModel | AIModelInput): Promise<boolean> {
    try {
      // Simple test based on provider
      switch(model.provider) {
        case 'openai':
          // Just validate key format for now - would make actual API call in production
          if (!model.api_key.startsWith('sk-')) {
            toast.error('Invalid OpenAI API key format');
            return false;
          }
          break;
          
        case 'google':
          // Simple validation for Google API key
          if (model.api_key.length < 20) {
            toast.error('Invalid Google API key format');
            return false;
          }
          break;
          
        case 'anthropic':
          // Simple validation for Anthropic API key
          if (!model.api_key.startsWith('sk-')) {
            toast.error('Invalid Anthropic API key format');
            return false;
          }
          break;
          
        case 'deepseek':
          // Test actual connection to DeepSeek
          try {
            const testResult = await this.deepseekTest(model);
            if (!testResult) {
              toast.error('Failed to connect to DeepSeek API');
              return false;
            }
          } catch (error) {
            toast.error(`DeepSeek connection error: ${error.message}`);
            return false;
          }
          break;
          
        case 'siliconflow':
          // Test actual connection to SiliconFlow
          try {
            const testResult = await this.siliconFlowTest(model);
            if (!testResult) {
              toast.error('Failed to connect to SiliconFlow API');
              return false;
            }
          } catch (error) {
            toast.error(`SiliconFlow connection error: ${error.message}`);
            return false;
          }
          break;
          
        case 'openrouter':
          // Test actual connection to OpenRouter
          try {
            const testResult = await this.openRouterTest(model);
            if (!testResult) {
              toast.error('Failed to connect to OpenRouter API');
              return false;
            }
          } catch (error) {
            toast.error(`OpenRouter connection error: ${error.message}`);
            return false;
          }
          break;
          
        default:
          // Basic validation for other providers
          if (model.api_key.length < 10) {
            toast.error(`Invalid ${model.provider} API key format`);
            return false;
          }
      }
      
      toast.success(`Successfully connected to ${model.provider}`);
      return true;
    } catch (error) {
      console.error('Error testing connection:', error);
      toast.error(`Failed to connect to ${model.provider}: ${error.message}`);
      return false;
    }
  }

  /**
   * Test connection to DeepSeek API
   */
  private static async deepseekTest(model: AIModel | AIModelInput): Promise<boolean> {
    const baseUrl = model.base_url || 'https://api.deepseek.com';
    const endpoint = `${baseUrl}/v1/chat/completions`;
    
    const payload = {
      model: model.model_name || 'deepseek-chat',
      messages: [
        { role: "system", content: "You are a helpful assistant." },
        { role: "user", content: "Hello, are you operational?" }
      ],
      max_tokens: 50,
      temperature: 0.7
    };
    
    try {
      console.log('Testing DeepSeek connection with payload:', JSON.stringify(payload, null, 2));
      
      const response = await fetch(endpoint, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${model.api_key}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(payload)
      });
      
      const responseData = await response.json();
      console.log('DeepSeek test response:', responseData);
      
      if (!response.ok) {
        throw new Error(responseData.error?.message || `API Error: ${response.status}`);
      }
      
      return true;
    } catch (error) {
      console.error('DeepSeek test error:', error);
      throw error;
    }
  }

  /**
   * Test connection to SiliconFlow API
   */
  private static async siliconFlowTest(model: AIModel | AIModelInput): Promise<boolean> {
    const baseUrl = model.base_url || 'https://api.siliconflow.cn/v1';
    const endpoint = `${baseUrl}/chat/completions`;
    
    const payload = {
      model: model.model_name,
      messages: [
        { role: "user", content: prompt }
      ],
      max_tokens: 50,
      temperature: 0.7
    };
    
    const response = await fetch(endpoint, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${model.api_key}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(payload)
    });
    
    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error?.message || 'Unknown error');
    }
    
    return true;
  }
  
  /**
   * Test connection to OpenRouter API
   */
  private static async openRouterTest(model: AIModel | AIModelInput): Promise<boolean> {
    const baseUrl = model.base_url || 'https://openrouter.ai/api/v1';
    const endpoint = `${baseUrl}/chat/completions`;
    
    const payload = {
      model: model.model_name || 'openai/gpt-3.5-turbo',
      messages: [
        { role: "user", content: "Hello, are you operational?" }
      ],
      max_tokens: 50,
      temperature: 0.7
    };
    
    const response = await fetch(endpoint, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${model.api_key}`,
        'Content-Type': 'application/json',
        'HTTP-Referer': window.location.origin,
        'X-Title': 'Research Assistant'
      },
      body: JSON.stringify(payload)
    });
    
    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error?.message || 'Unknown error');
    }
    
    return true;
  }
  
  /**
   * Generate a completion with the AI model
   */
  static async generateCompletion(
    prompt: string, 
    modelId?: string,
    context?: string,
    papers?: any[]
  ): Promise<string> {
    try {
      // Get the model to use
      const model = modelId 
        ? await this.getModelById(modelId)
        : await this.getDefaultModel();
      
      if (!model) {
        throw new Error('No AI model available. Please configure one in AI Settings.');
      }

      console.log('Using AI model:', model.name, model.provider);
      
      // Check if we have any papers context to provide
      let promptContent = prompt;
      
      if (papers && papers.length > 0) {
        promptContent = `I want you to act as an academic research assistant. I'll provide you with information about academic papers, and you'll help answer questions about them.

CONTEXT:
The following are summaries of academic papers related to the query:

${papers.map((paper, index) => `
PAPER ${index + 1}:
Title: ${paper.name}
Author: ${paper.author || 'Unknown'}
Year: ${paper.year || 'Unknown'}
Abstract: ${paper.abstract || 'No abstract provided.'}
DOI: ${paper.doi || 'N/A'}
`).join('\n')}

Based on the above academic papers, please answer the following question:
${prompt}

Your response should be clear, factual, and directly reference the papers when appropriate. If the papers don't contain information to answer the question, please state that clearly.`;
      }
      else if (context) {
        promptContent = `CONTEXT: ${context}\n\nQUESTION: ${prompt}\n\nPlease provide a helpful response based on the context provided.`;
      }
      
      console.log('Generating real AI completion with model:', model.provider);
      
      // Based on the model provider, call different API endpoints
      switch (model.provider) {
        case 'siliconflow':
          return await this.generateSiliconFlowCompletion(model, promptContent);
        case 'openai':
          return await this.generateOpenAICompletion(model, promptContent);
        case 'anthropic':
          return await this.generateAnthropicCompletion(model, promptContent);
        case 'google':
          return await this.generateGoogleCompletion(model, promptContent);
        case 'openrouter':
          return await this.generateOpenRouterCompletion(model, promptContent);
        case 'deepseek':
          return await this.generateDeepseekCompletion(model, promptContent);
        default:
          throw new Error(`Provider ${model.provider} is not implemented yet.`);
      }
    } catch (error) {
      console.error('Error generating completion:', error);
      throw error;
    }
  }
  
  /**
   * Generate completion using SiliconFlow API
   */
  private static async generateSiliconFlowCompletion(model: AIModel, prompt: string): Promise<string> {
    const baseUrl = model.base_url || 'https://api.siliconflow.cn/v1';
    const endpoint = `${baseUrl}/chat/completions`;
    
    const payload = {
      model: model.model_name,
      messages: [
        { role: "user", content: prompt }
      ],
      stream: false,
      max_tokens: 1024,
      temperature: 0.7,
      top_p: 0.7,
      top_k: 50,
      frequency_penalty: 0.5,
      n: 1,
      response_format: { type: "text" }
    };
    
    try {
      console.log('Making API request to SiliconFlow:', endpoint);
      
      const response = await fetch(endpoint, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${model.api_key}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(payload)
      });
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error?.message || `API Error: ${response.status}`);
      }
      
      const data = await response.json();
      console.log('SiliconFlow API response:', data);
      
      if (data.choices && data.choices.length > 0) {
        return data.choices[0].message.content;
      }
      
      throw new Error('No content in API response');
    } catch (error) {
      console.error('Error making SiliconFlow API request:', error);
      throw error;
    }
  }
  
  /**
   * Generate completion using OpenAI API
   */
  private static async generateOpenAICompletion(model: AIModel, prompt: string): Promise<string> {
    const baseUrl = model.base_url || 'https://api.openai.com/v1';
    const endpoint = `${baseUrl}/chat/completions`;
    
    const payload = {
      model: model.model_name,
      messages: [
        { role: "user", content: prompt }
      ],
      stream: false,
      max_tokens: 1024,
      temperature: 0.7,
      top_p: 0.7,
      frequency_penalty: 0.5,
      n: 1,
      response_format: { type: "text" }
    };
    
    try {
      console.log('Making API request to OpenAI:', endpoint);
      
      const response = await fetch(endpoint, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${model.api_key}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(payload)
      });
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error?.message || `API Error: ${response.status}`);
      }
      
      const data = await response.json();
      console.log('OpenAI API response:', data);
      
      if (data.choices && data.choices.length > 0) {
        return data.choices[0].message.content;
      }
      
      throw new Error('No content in API response');
    } catch (error) {
      console.error('Error making OpenAI API request:', error);
      throw error;
    }
  }
  
  /**
   * Generate completion using Anthropic API
   */
  private static async generateAnthropicCompletion(model: AIModel, prompt: string): Promise<string> {
    const baseUrl = model.base_url || 'https://api.anthropic.com/v1';
    const endpoint = `${baseUrl}/messages`;
    
    const payload = {
      model: model.model_name,
      max_tokens: 1024,
      messages: [
        {
          role: "user",
          content: prompt
        }
      ],
      temperature: 0.7,
      top_p: 0.7,
      top_k: 50,
      stream: false
    };
    
    try {
      console.log('Making API request to Anthropic:', endpoint);
      
      const response = await fetch(endpoint, {
        method: 'POST',
        headers: {
          'x-api-key': model.api_key,
          'anthropic-version': '2023-06-01',
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(payload)
      });
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error?.message || `API Error: ${response.status}`);
      }
      
      const data = await response.json();
      console.log('Anthropic API response:', data);
      
      if (data.content && data.content.length > 0) {
        return data.content[0].text;
      }
      
      throw new Error('No content in API response');
    } catch (error) {
      console.error('Error making Anthropic API request:', error);
      throw error;
    }
  }
  
  /**
   * Generate completion using Google API
   */
  private static async generateGoogleCompletion(model: AIModel, prompt: string): Promise<string> {
    const baseUrl = model.base_url || 'https://generativelanguage.googleapis.com/v1';
    const endpoint = `${baseUrl}/models/${model.model_name}:generateContent`;
    
    const payload = {
      contents: [
        {
          parts: [
            {
              text: prompt
            }
          ]
        }
      ],
      generationConfig: {
        temperature: 0.7,
        topP: 0.7,
        topK: 50,
        maxOutputTokens: 1024,
      },
      safetySettings: [
        {
          category: "HARM_CATEGORY_HARASSMENT",
          threshold: "BLOCK_NONE"
        },
        {
          category: "HARM_CATEGORY_HATE_SPEECH",
          threshold: "BLOCK_NONE"
        },
        {
          category: "HARM_CATEGORY_SEXUALLY_EXPLICIT",
          threshold: "BLOCK_NONE"
        },
        {
          category: "HARM_CATEGORY_DANGEROUS_CONTENT",
          threshold: "BLOCK_NONE"
        }
      ]
    };
    
    try {
      console.log('Making API request to Google:', endpoint);
      
      const response = await fetch(endpoint, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(payload)
      });
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error?.message || `API Error: ${response.status}`);
      }
      
      const data = await response.json();
      console.log('Google API response:', data);
      
      if (data.candidates && data.candidates.length > 0) {
        return data.candidates[0].content.parts[0].text;
      }
      
      throw new Error('No content in API response');
    } catch (error) {
      console.error('Error making Google API request:', error);
      throw error;
    }
  }
  
  /**
   * Generate completion using OpenRouter API
   */
  private static async generateOpenRouterCompletion(model: AIModel, prompt: string): Promise<string> {
    const baseUrl = model.base_url || 'https://openrouter.ai/api/v1';
    const endpoint = `${baseUrl}/chat/completions`;
    
    // Format for OpenRouter
    const payload = {
      model: model.model_name,
      messages: [
        { role: "user", content: prompt }
      ],
      stream: false,
      max_tokens: 1024,
      temperature: 0.7
    };
    
    try {
      console.log('Making API request to OpenRouter:', endpoint);
      
      const response = await fetch(endpoint, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${model.api_key}`,
          'Content-Type': 'application/json',
          'HTTP-Referer': window.location.origin,
          'X-Title': 'Research Assistant'
        },
        body: JSON.stringify(payload)
      });
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error?.message || `API Error: ${response.status}`);
      }
      
      const data = await response.json();
      console.log('OpenRouter API response:', data);
      
      if (data.choices && data.choices.length > 0) {
        return data.choices[0].message.content;
      }
      
      throw new Error('No content in API response');
    } catch (error) {
      console.error('Error making OpenRouter API request:', error);
      throw error;
    }
  }
  
  /**
   * Generate completion using DeepSeek API
   */
  private static async generateDeepseekCompletion(model: AIModel, prompt: string): Promise<string> {
    const baseUrl = model.base_url || 'https://api.deepseek.com';
    const endpoint = `${baseUrl}/v1/chat/completions`;
    
    const payload = {
      model: model.model_name || 'deepseek-chat',
      messages: [
        { role: "system", content: "You are a helpful research assistant." },
        { role: "user", content: prompt }
      ],
      stream: false,
      max_tokens: 1024,
      temperature: 0.7,
      top_p: 0.7,
      frequency_penalty: 0.5,
      n: 1
    };
    
    try {
      console.log('Making DeepSeek API request with payload:', JSON.stringify(payload, null, 2));
      
      const response = await fetch(endpoint, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${model.api_key}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(payload)
      });
      
      const data = await response.json();
      console.log('DeepSeek API response:', data);
      
      if (!response.ok) {
        throw new Error(data.error?.message || `API Error: ${response.status}`);
      }
      
      if (data.choices && data.choices.length > 0) {
        return data.choices[0].message.content;
      }
      
      throw new Error('No content in API response');
    } catch (error) {
      console.error('Error making DeepSeek API request:', error);
      throw error;
    }
  }
  
  /**
   * Get model by ID
   */
  static async getModelById(id: string): Promise<AIModel | null> {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        console.error('User not authenticated');
        return null;
      }

      const { data, error } = await supabase
        .from('ai_models')
        .select('*')
        .eq('id', id)
        .eq('user_id', user.id)
        .maybeSingle();
        
      if (error) {
        console.error('Error fetching AI model by ID:', error);
        throw error;
      }
      
      if (!data) {
        return null;
      }

      const model = data as DatabaseAIModel;
      return {
        id: model.id,
        name: model.name,
        provider: model.provider,
        api_key: model.api_key,
        base_url: model.base_url,
        model_name: model.model_name,
        is_default: model.is_default,
        created_at: model.created_at,
        updated_at: model.updated_at,
        user_id: model.user_id
      };
    } catch (error) {
      console.error('Error in getModelById:', error);
      return null;
    }
  }

  /**
   * Get papers for a search
   */
  static async getPapersForSearch(searchId: string): Promise<any[]> {
    try {
      const { data, error } = await supabase
        .from('papers')
        .select('*')
        .eq('search_id', searchId);
        
      if (error) {
        console.error('Error fetching papers for AI context:', error);
        throw error;
      }
      
      return data || [];
    } catch (error) {
      console.error('Error in getPapersForSearch:', error);
      return [];
    }
  }

  /**
   * Get papers for a PDF batch
   */
  static async getPapersForPDFBatch(batchId: string): Promise<any[]> {
    try {
      // First get the PDF uploads associated with this batch
      const { data: batchPdfs, error: batchError } = await supabase
        .from('batch_pdfs')
        .select('pdf_id')
        .eq('batch_id', batchId);
        
      if (batchError) {
        console.error('Error fetching batch PDFs:', batchError);
        throw batchError;
      }
      
      if (!batchPdfs || batchPdfs.length === 0) {
        return [];
      }
      
      // Get the PDF uploads data
      const pdfIds = batchPdfs.map(bp => bp.pdf_id);
      const { data: pdfs, error: pdfsError } = await supabase
        .from('pdf_uploads')
        .select('*')
        .in('id', pdfIds);
        
      if (pdfsError) {
        console.error('Error fetching PDF uploads:', pdfsError);
        throw pdfsError;
      }
      
      // Transform PDF uploads into paper format
      return (pdfs || []).map(pdf => ({
        name: pdf.title || pdf.filename,
        authors: pdf.authors ? pdf.authors.split(',').map((a: string) => a.trim()) : ['Unknown'],
        year: pdf.year || new Date().getFullYear(),
        abstract: pdf.background || '',
        doi: pdf.doi || null,
        research_question: pdf.research_question || null,
        major_findings: pdf.major_findings || null,
        suggestions: pdf.suggestions || null,
        full_text: pdf.full_text || null
      }));
    } catch (error) {
      console.error('Error in getPapersForPDFBatch:', error);
      return [];
    }
  }
}
