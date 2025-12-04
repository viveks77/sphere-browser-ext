import React, { useCallback } from 'react';
import { Button } from '@/components/ui/button';

interface ConfigStatusProps {
  onOpenOptions?: () => void;
}

const QUICK_LINKS = [
  'Right-click the extension icon → Options',
  'Extension menu → Manage Extensions → Extension Options',
] as const;

export const ConfigStatus: React.FC<ConfigStatusProps> = ({ onOpenOptions }) => {
  const handleOpenOptions = useCallback(() => {
    if (onOpenOptions) {
      onOpenOptions();
    } else {
      browser.runtime.openOptionsPage();
    }
  }, [onOpenOptions]);

  return (
    <div className="flex min-h-screen w-[450px] items-center justify-center bg-linear-to-br from-background to-muted p-6">
      <div className="w-full max-w-md space-y-6 rounded-lg border border-border bg-card p-8 text-center shadow-lg">
        <div className="space-y-2">
          <h2 className="text-2xl font-bold text-foreground">Extension Not Configured</h2>
          <p className="text-sm text-muted-foreground">
            The extension requires API credentials to function. Please set up your configuration.
          </p>
        </div>

        <div className="space-y-2 rounded-lg border border-amber-200 bg-amber-50 p-4 dark:border-amber-800 dark:bg-amber-950">
          <p className="text-sm font-semibold text-amber-900 dark:text-amber-100">
            Missing Configuration
          </p>
          <p className="text-sm text-amber-900 dark:text-amber-100">
            You need to add your AI service API keys in the options page before using this extension.
          </p>
        </div>

        <Button
          onClick={handleOpenOptions}
          className="w-full bg-primary text-primary-foreground hover:bg-primary/90 disabled:opacity-50"
        >
          Open Options Page
        </Button>

        <div className="space-y-1 text-xs text-muted-foreground">
          <p className="font-semibold">Alternative access methods:</p>
          {QUICK_LINKS.map((link, index) => (
            <p key={index} className="flex items-start gap-2">
              <span className="shrink-0">•</span>
              <span>{link}</span>
            </p>
          ))}
        </div>
      </div>
    </div>
  );
}
