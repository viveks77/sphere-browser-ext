import { AIServiceFactoryConfig } from '@/services';

export interface StoredConfig {
  llmProvider: string;
  llmApiKey: string;
  llmModel: string;
  embeddingApiKey: string;
  embeddingModel: string;
}

/**
 * Load configuration from browser storage
 */
export async function loadStoredConfig(): Promise<StoredConfig | null> {
  try {
    const result = await browser.storage.local.get('extension_config');
    return result.extension_config || null;
  } catch (error) {
    console.error('Failed to load config from storage:', error);
    return null;
  }
}

/**
 * Check if configuration is properly set
 */
export async function isConfigured(): Promise<boolean> {
  const config = await loadStoredConfig();
  return !!(config?.llmApiKey && config?.embeddingApiKey);
}

/**
 * Convert stored config to AIServiceFactoryConfig
 */
export function convertToFactoryConfig(stored: StoredConfig): AIServiceFactoryConfig {
  return {
    llm: {
      provider: stored.llmProvider as 'gemini',
      config: {
        apiKey: stored.llmApiKey,
        model: stored.llmModel,
        temperature: 0.7,
        maxTokens: 2048,
        topP: 1,
        topK: 1,
        debug: false,
      },
    },
    embedding: {
      provider: stored.llmProvider as 'gemini',
      config: {
        apiKey: stored.embeddingApiKey,
        model: stored.embeddingModel,
        debug: false,
      },
    },
    vectorStore: {
      storageKey: 'browser_ext_vector_store',
      debug: false,
    },
  };
}

/**
 * Get the configuration or throw an error if not set
 */
export async function getOrThrowConfig(): Promise<AIServiceFactoryConfig> {
  const stored = await loadStoredConfig();
  if (!stored?.llmApiKey || !stored?.embeddingApiKey) {
    throw new Error(
      'Extension is not configured. Please visit the options page to add your API credentials.'
    );
  }
  return convertToFactoryConfig(stored);
}

/**
 * Get configuration safely without throwing
 */
export async function getConfigSafely(): Promise<AIServiceFactoryConfig | null> {
  try {
    return await getOrThrowConfig();
  } catch (error) {
    console.warn('Failed to get configuration:', error);
    return null;
  }
}
