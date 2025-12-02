/**
 * AI Services Configuration Template
 * Copy and customize this file for your application
 */

import { AIServiceFactoryConfig } from '@/services';

/**
 * Development configuration
 * Use this for local development with debug logging enabled
 */
export const devConfig: AIServiceFactoryConfig = {
  llm: {
    provider: 'gemini',
    config: {
      apiKey: '',
      model: 'gemini-2.5-flash',
      temperature: 0.7,
      maxTokens: 2048,
      topP: 1,
      topK: 1,
      debug: true,
    },
  },
  embedding: {
    provider: 'gemini',
    config: {
      apiKey: '',
      model: 'text-embedding-004',
      debug: true,
    },
  },
  vectorStore: {
    storageKey: 'browser_ext_vector_store_dev',
    debug: true,
  },
};

/**
 * Validate configuration
 */
export function validateConfig(config: AIServiceFactoryConfig): boolean {
  const errors: string[] = [];

  if (!config.llm?.config?.apiKey) {
    errors.push('LLM API key is required');
  }

  if (!config.embedding?.config?.apiKey) {
    errors.push('Embedding API key is required');
  }

  if (config.llm?.config?.temperature !== undefined) {
    if (config.llm.config.temperature < 0 || config.llm.config.temperature > 2) {
      errors.push('LLM temperature must be between 0 and 2');
    }
  }

  if (config.llm?.config?.maxTokens !== undefined) {
    if (config.llm.config.maxTokens < 1 || config.llm.config.maxTokens > 4096) {
      errors.push('LLM maxTokens must be between 1 and 4096');
    }
  }

  if (errors.length > 0) {
    console.error('Configuration validation errors:', errors);
    return false;
  }

  return true;
}

/**
 * Merge configuration overrides with base configuration
 */
export function mergeConfig(
  baseConfig: AIServiceFactoryConfig,
  overrides: Partial<AIServiceFactoryConfig>
): AIServiceFactoryConfig {
  return {
    llm: {
      ...baseConfig.llm,
      ...overrides.llm,
      config: {
        ...baseConfig.llm.config,
        ...overrides.llm?.config,
      },
    },
    embedding: {
      ...baseConfig.embedding,
      ...overrides.embedding,
      config: {
        ...baseConfig.embedding.config,
        ...overrides.embedding?.config,
      },
    },
    vectorStore: {
      ...baseConfig.vectorStore,
      ...overrides.vectorStore,
    },
  };
}
