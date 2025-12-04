import React, { useState, useEffect, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';

interface Config {
  llmProvider: string;
  llmApiKey: string;
  llmModel: string;
  embeddingApiKey: string;
  embeddingModel: string;
}

type SaveStatus = 'idle' | 'success' | 'error';

const DEFAULT_CONFIG: Config = {
  llmProvider: 'gemini',
  llmApiKey: '',
  llmModel: 'gemini-2.5-flash',
  embeddingApiKey: '',
  embeddingModel: 'text-embedding-004',
};

const GEMINI_API_URL = 'https://makersuite.google.com/app/apikey';
const MESSAGE_TIMEOUT_MS = 3000;

const OptionsPage: React.FC = () => {
  const [config, setConfig] = useState<Config>(DEFAULT_CONFIG);
  const [isSaving, setIsSaving] = useState(false);
  const [saveMessage, setSaveMessage] = useState<string | null>(null);
  const [saveStatus, setSaveStatus] = useState<SaveStatus>('idle');

  // Load config on mount
  useEffect(() => {
    const loadConfig = async () => {
      try {
        const result = await browser.storage.local.get('extension_config');
        if (result.extension_config) {
          setConfig(result.extension_config);
        }
      } catch (error) {
        console.error('Failed to load configuration:', error);
      }
    };
    loadConfig();
  }, []);

  const handleChange = useCallback((e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setConfig((prev) => ({ ...prev, [name]: value }));
  }, []);

  const showMessage = useCallback((message: string, status: SaveStatus) => {
    setSaveMessage(message);
    setSaveStatus(status);
    const timer = setTimeout(() => setSaveMessage(null), MESSAGE_TIMEOUT_MS);
    return () => clearTimeout(timer);
  }, []);

  const handleSave = useCallback(async () => {
    // Validate required fields
    if (!config.llmApiKey?.trim() || !config.embeddingApiKey?.trim()) {
      showMessage('API keys are required', 'error');
      return;
    }

    setIsSaving(true);
    try {
      await browser.storage.local.set({ extension_config: config });
      showMessage('Configuration saved successfully!', 'success');
    } catch (error) {
      console.error('Failed to save configuration:', error);
      showMessage('Failed to save configuration', 'error');
    } finally {
      setIsSaving(false);
    }
  }, [config, showMessage]);

  return (
    <div className="min-h-screen bg-linear-to-br from-background to-muted p-8">
      <div className="mx-auto max-w-2xl">
        {/* Header */}
        <div className="mb-8">
          <h1 className="mb-2 text-4xl font-bold text-foreground">Extension Settings</h1>
          <p className="text-muted-foreground">
            Configure your AI service credentials to enable the extension
          </p>
        </div>

        {/* Alert Message */}
        {saveMessage && (
          <div
            className={`mb-6 rounded-lg border p-4 ${
              saveStatus === 'success'
                ? 'border-green-300 bg-green-100 text-green-800'
                : 'border-red-300 bg-red-100 text-red-800'
            }`}
            role="alert"
          >
            {saveMessage}
          </div>
        )}

        {/* Configuration Form */}
        <div className="bg-card rounded-lg border border-border shadow-lg p-8 space-y-6">
          {/* LLM Provider */}
          <div>
            <label htmlFor="llmProvider" className="mb-2 block text-sm font-semibold text-foreground">
              LLM Provider
            </label>
            <select
              id="llmProvider"
              name="llmProvider"
              value={config.llmProvider}
              onChange={handleChange}
              className="w-full rounded-lg border border-input bg-background px-4 py-2 text-foreground focus:outline-none focus:ring-2 focus:ring-primary"
              disabled
            >
              <option value="gemini">Google Gemini</option>
            </select>
            <p className="mt-1 text-xs text-muted-foreground">
              Currently only Google Gemini is supported
            </p>
          </div>

          {/* LLM API Key */}
          <div>
            <label htmlFor="llmApiKey" className="mb-2 block text-sm font-semibold text-foreground">
              LLM API Key <span className="text-red-500">*</span>
            </label>
            <Input
              id="llmApiKey"
              type="password"
              name="llmApiKey"
              value={config.llmApiKey}
              onChange={handleChange}
              placeholder="Enter your Gemini API key"
              className="w-full"
              required
            />
            <p className="mt-1 text-xs text-muted-foreground">
              Get your API key from{' '}
              <a
                href={GEMINI_API_URL}
                target="_blank"
                rel="noopener noreferrer"
                className="text-primary hover:underline"
              >
                Google AI Studio
              </a>
            </p>
          </div>

          {/* LLM Model */}
          <div>
            <label htmlFor="llmModel" className="mb-2 block text-sm font-semibold text-foreground">
              LLM Model
            </label>
            <Input
              id="llmModel"
              type="text"
              name="llmModel"
              value={config.llmModel}
              onChange={handleChange}
              placeholder="e.g., gemini-2.5-flash"
              className="w-full"
            />
            <p className="mt-1 text-xs text-muted-foreground">
              Available: gemini-2.5-flash, gemini-1.5-pro, gemini-1.5-flash
            </p>
          </div>

          {/* Embedding API Key */}
          <div>
            <label htmlFor="embeddingApiKey" className="mb-2 block text-sm font-semibold text-foreground">
              Embedding API Key <span className="text-red-500">*</span>
            </label>
            <Input
              id="embeddingApiKey"
              type="password"
              name="embeddingApiKey"
              value={config.embeddingApiKey}
              onChange={handleChange}
              placeholder="Enter your embedding API key"
              className="w-full"
              required
            />
            <p className="mt-1 text-xs text-muted-foreground">
              Can be the same as LLM API key if using the same provider
            </p>
          </div>

          {/* Embedding Model */}
          <div>
            <label htmlFor="embeddingModel" className="mb-2 block text-sm font-semibold text-foreground">
              Embedding Model
            </label>
            <Input
              id="embeddingModel"
              type="text"
              name="embeddingModel"
              value={config.embeddingModel}
              onChange={handleChange}
              placeholder="e.g., text-embedding-004"
              className="w-full"
            />
            <p className="mt-1 text-xs text-muted-foreground">
              Available: text-embedding-004, text-embedding-005
            </p>
          </div>

          {/* Save Button */}
          <div className="flex gap-3 pt-4">
            <Button
              onClick={handleSave}
              disabled={isSaving}
              className="bg-primary px-6 py-2 text-primary-foreground hover:bg-primary/90 disabled:opacity-50"
            >
              {isSaving ? 'Saving...' : 'Save Configuration'}
            </Button>
          </div>
        </div>

        {/* Info Box */}
        <div className="mt-8 space-y-2 rounded-lg border border-blue-200 bg-blue-50 p-6 dark:border-blue-800 dark:bg-blue-950">
          <h3 className="font-semibold text-blue-900 dark:text-blue-100">
            ℹ️ Configuration Required
          </h3>
          <p className="text-sm text-blue-800 dark:text-blue-200">
            The extension requires valid API keys to function. Without these settings, the chat
            features will not work.
          </p>
        </div>
      </div>
    </div>
  );
};

export default OptionsPage;
