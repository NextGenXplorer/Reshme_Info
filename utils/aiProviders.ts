/**
 * Multi-Provider AI System
 * Handles automatic fallback between AI providers when rate limited
 */

import Groq from 'groq-sdk';

// Provider types
export type AIProvider = 'gemini' | 'groq' | 'openrouter';

export interface AIProviderConfig {
  name: AIProvider;
  displayName: string;
  apiKey: string;
  model: string;
  isAvailable: boolean;
  lastError?: string;
  lastErrorTime?: number;
  rateLimitedUntil?: number;
}

export interface AIResponse {
  success: boolean;
  content?: string;
  provider: AIProvider;
  error?: string;
  isRateLimited?: boolean;
}

// Rate limit cooldown (5 minutes)
const RATE_LIMIT_COOLDOWN_MS = 5 * 60 * 1000;

// Provider configurations
const providers: Map<AIProvider, AIProviderConfig> = new Map();

/**
 * Initialize all available providers
 */
export function initializeProviders(): void {
  // Gemini Provider (Admin-specific key)
  const geminiKey = process.env.EXPO_PUBLIC_GEMINI_ADMIN_API_KEY || '';
  if (geminiKey && geminiKey !== 'your-gemini-api-key-here') {
    providers.set('gemini', {
      name: 'gemini',
      displayName: 'Gemini 2.0 Flash',
      apiKey: geminiKey,
      model: 'gemini-2.0-flash-lite',
      isAvailable: true,
    });
  }

  // Groq Provider (Very fast, generous free tier)
  const groqKey = process.env.EXPO_PUBLIC_GROQ_API_KEY || '';
  if (groqKey && groqKey !== 'your-groq-api-key-here') {
    providers.set('groq', {
      name: 'groq',
      displayName: 'Groq Llama 3.3',
      apiKey: groqKey,
      model: 'llama-3.3-70b-versatile',
      isAvailable: true,
    });
  }

  // OpenRouter Provider (Access to many models, pay-per-use)
  const openrouterKey = process.env.EXPO_PUBLIC_OPENROUTER_API_KEY || '';
  if (openrouterKey && openrouterKey !== 'your-openrouter-api-key-here') {
    providers.set('openrouter', {
      name: 'openrouter',
      displayName: 'OpenRouter',
      apiKey: openrouterKey,
      model: 'meta-llama/llama-3.1-8b-instruct:free', // Free tier model
      isAvailable: true,
    });
  }
}

/**
 * Check if a provider is currently rate limited
 */
function isProviderRateLimited(provider: AIProviderConfig): boolean {
  if (!provider.rateLimitedUntil) return false;
  return Date.now() < provider.rateLimitedUntil;
}

/**
 * Mark a provider as rate limited
 */
function markProviderRateLimited(providerName: AIProvider): void {
  const provider = providers.get(providerName);
  if (provider) {
    provider.rateLimitedUntil = Date.now() + RATE_LIMIT_COOLDOWN_MS;
    provider.lastErrorTime = Date.now();
  }
}

/**
 * Get list of available (non-rate-limited) providers
 */
export function getAvailableProviders(): AIProviderConfig[] {
  const available: AIProviderConfig[] = [];
  providers.forEach((config) => {
    if (config.isAvailable && !isProviderRateLimited(config)) {
      available.push(config);
    }
  });
  return available;
}

/**
 * Get all configured providers with their status
 */
export function getAllProviders(): AIProviderConfig[] {
  return Array.from(providers.values());
}

/**
 * Call Gemini API
 */
async function callGemini(prompt: string, config: AIProviderConfig): Promise<AIResponse> {
  try {
    const response = await fetch(
      `https://generativelanguage.googleapis.com/v1/models/${config.model}:generateContent?key=${config.apiKey}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contents: [{ parts: [{ text: prompt }] }],
        }),
      }
    );

    if (!response.ok) {
      const errorData = await response.json();
      const errorMessage = errorData.error?.message || 'Unknown error';

      // Check for rate limit errors
      if (response.status === 429 || errorMessage.toLowerCase().includes('rate') ||
          errorMessage.toLowerCase().includes('quota')) {
        markProviderRateLimited('gemini');
        return {
          success: false,
          provider: 'gemini',
          error: errorMessage,
          isRateLimited: true,
        };
      }

      throw new Error(errorMessage);
    }

    const data = await response.json();
    const content = data.candidates?.[0]?.content?.parts?.[0]?.text;

    if (!content) {
      throw new Error('No content in response');
    }

    return {
      success: true,
      content,
      provider: 'gemini',
    };
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    return {
      success: false,
      provider: 'gemini',
      error: errorMessage,
    };
  }
}

/**
 * Call Groq API
 */
async function callGroq(prompt: string, config: AIProviderConfig): Promise<AIResponse> {
  try {
    const groq = new Groq({ apiKey: config.apiKey, dangerouslyAllowBrowser: true });

    const completion = await groq.chat.completions.create({
      messages: [
        {
          role: 'user',
          content: prompt,
        },
      ],
      model: config.model,
      temperature: 0.1,
      max_tokens: 2048,
    });

    const content = completion.choices?.[0]?.message?.content;

    if (!content) {
      throw new Error('No content in response');
    }

    return {
      success: true,
      content,
      provider: 'groq',
    };
  } catch (error: any) {
    const errorMessage = error?.message || 'Unknown error';

    // Check for rate limit errors
    if (error?.status === 429 || errorMessage.toLowerCase().includes('rate') ||
        errorMessage.toLowerCase().includes('limit')) {
      markProviderRateLimited('groq');
      return {
        success: false,
        provider: 'groq',
        error: errorMessage,
        isRateLimited: true,
      };
    }

    return {
      success: false,
      provider: 'groq',
      error: errorMessage,
    };
  }
}

/**
 * Call OpenRouter API
 */
async function callOpenRouter(prompt: string, config: AIProviderConfig): Promise<AIResponse> {
  try {
    const response = await fetch('https://openrouter.ai/api/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${config.apiKey}`,
        'Content-Type': 'application/json',
        'HTTP-Referer': 'https://reshmeinfo.app',
        'X-Title': 'ReshmeInfo',
      },
      body: JSON.stringify({
        model: config.model,
        messages: [{ role: 'user', content: prompt }],
        temperature: 0.1,
        max_tokens: 2048,
      }),
    });

    if (!response.ok) {
      const errorData = await response.json();
      const errorMessage = errorData.error?.message || 'Unknown error';

      // Check for rate limit errors
      if (response.status === 429 || errorMessage.toLowerCase().includes('rate')) {
        markProviderRateLimited('openrouter');
        return {
          success: false,
          provider: 'openrouter',
          error: errorMessage,
          isRateLimited: true,
        };
      }

      throw new Error(errorMessage);
    }

    const data = await response.json();
    const content = data.choices?.[0]?.message?.content;

    if (!content) {
      throw new Error('No content in response');
    }

    return {
      success: true,
      content,
      provider: 'openrouter',
    };
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    return {
      success: false,
      provider: 'openrouter',
      error: errorMessage,
    };
  }
}

/**
 * Call a specific provider
 */
async function callProvider(
  prompt: string,
  providerName: AIProvider
): Promise<AIResponse> {
  const config = providers.get(providerName);

  if (!config) {
    return {
      success: false,
      provider: providerName,
      error: `Provider ${providerName} not configured`,
    };
  }

  if (isProviderRateLimited(config)) {
    const remainingTime = Math.ceil((config.rateLimitedUntil! - Date.now()) / 1000);
    return {
      success: false,
      provider: providerName,
      error: `Rate limited. Try again in ${remainingTime}s`,
      isRateLimited: true,
    };
  }

  switch (providerName) {
    case 'gemini':
      return callGemini(prompt, config);
    case 'groq':
      return callGroq(prompt, config);
    case 'openrouter':
      return callOpenRouter(prompt, config);
    default:
      return {
        success: false,
        provider: providerName,
        error: `Unknown provider: ${providerName}`,
      };
  }
}

/**
 * Call AI with automatic fallback between providers
 * Tries each available provider in order until one succeeds
 */
export async function callAIWithFallback(
  prompt: string,
  preferredProvider?: AIProvider
): Promise<AIResponse & { triedProviders: AIProvider[] }> {
  // Initialize providers if not done
  if (providers.size === 0) {
    initializeProviders();
  }

  const triedProviders: AIProvider[] = [];
  const availableProviders = getAvailableProviders();

  if (availableProviders.length === 0) {
    return {
      success: false,
      provider: 'gemini',
      error: 'No AI providers available. Check API keys in .env file or wait for rate limits to reset.',
      triedProviders: [],
    };
  }

  // Reorder to try preferred provider first
  if (preferredProvider) {
    const preferredIndex = availableProviders.findIndex(p => p.name === preferredProvider);
    if (preferredIndex > 0) {
      const [preferred] = availableProviders.splice(preferredIndex, 1);
      availableProviders.unshift(preferred);
    }
  }

  // Try each provider
  for (const provider of availableProviders) {
    triedProviders.push(provider.name);
    console.log(`🤖 Trying AI provider: ${provider.displayName}`);

    const response = await callProvider(prompt, provider.name);

    if (response.success) {
      console.log(`✅ Success with ${provider.displayName}`);
      return { ...response, triedProviders };
    }

    console.log(`❌ ${provider.displayName} failed: ${response.error}`);

    // If rate limited, continue to next provider
    if (response.isRateLimited) {
      console.log(`⏳ ${provider.displayName} is rate limited, trying next...`);
      continue;
    }

    // For other errors, also try next provider
    continue;
  }

  // All providers failed
  return {
    success: false,
    provider: triedProviders[triedProviders.length - 1] || 'gemini',
    error: 'All AI providers failed or are rate limited. Please try again later.',
    triedProviders,
    isRateLimited: true,
  };
}

/**
 * Get rate limit status for all providers
 */
export function getRateLimitStatus(): { provider: AIProvider; isLimited: boolean; remainingSeconds: number }[] {
  const status: { provider: AIProvider; isLimited: boolean; remainingSeconds: number }[] = [];

  providers.forEach((config, name) => {
    const isLimited = isProviderRateLimited(config);
    const remainingSeconds = isLimited
      ? Math.ceil((config.rateLimitedUntil! - Date.now()) / 1000)
      : 0;

    status.push({
      provider: name,
      isLimited,
      remainingSeconds,
    });
  });

  return status;
}

/**
 * Reset rate limit for a specific provider (for testing/manual override)
 */
export function resetProviderRateLimit(providerName: AIProvider): void {
  const provider = providers.get(providerName);
  if (provider) {
    provider.rateLimitedUntil = undefined;
    provider.lastError = undefined;
    provider.lastErrorTime = undefined;
  }
}

/**
 * Get the count of available providers
 */
export function getProviderCount(): { total: number; available: number } {
  const total = providers.size;
  const available = getAvailableProviders().length;
  return { total, available };
}

// Initialize on import
initializeProviders();
