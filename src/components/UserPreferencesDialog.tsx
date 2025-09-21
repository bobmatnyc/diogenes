'use client';

import { useEffect, useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Separator } from '@/components/ui/separator';
import { Badge } from '@/components/ui/badge';
import { Save, RotateCcw } from 'lucide-react';
import ModelSelector from './ModelSelector';
import PersonalitySelector, { type PersonalityType } from './PersonalitySelector';

export interface UserPreferences {
  model: string;
  personality: PersonalityType;
  debugMode: boolean;
}

const DEFAULT_PREFERENCES: UserPreferences = {
  model: 'anthropic/claude-3.5-sonnet-20241022',
  personality: 'executive',
  debugMode: false,
};

interface UserPreferencesDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function UserPreferencesDialog({ open, onOpenChange }: UserPreferencesDialogProps) {
  const [preferences, setPreferences] = useState<UserPreferences>(DEFAULT_PREFERENCES);
  const [isDirty, setIsDirty] = useState(false);

  // Load preferences from localStorage on mount
  useEffect(() => {
    const stored = localStorage.getItem('user-preferences');
    if (stored) {
      try {
        const parsed = JSON.parse(stored);
        setPreferences(parsed);
      } catch (error) {
        console.error('Failed to parse stored preferences:', error);
      }
    }
  }, []);

  const handleSave = () => {
    localStorage.setItem('user-preferences', JSON.stringify(preferences));
    setIsDirty(false);

    // Trigger a custom event so the chat interface can update
    window.dispatchEvent(new CustomEvent('preferences-updated', { detail: preferences }));

    onOpenChange(false);
  };

  const handleReset = () => {
    setPreferences(DEFAULT_PREFERENCES);
    setIsDirty(true);
  };

  const updatePreference = <K extends keyof UserPreferences>(
    key: K,
    value: UserPreferences[K]
  ) => {
    setPreferences((prev) => ({ ...prev, [key]: value }));
    setIsDirty(true);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px] max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>User Preferences</DialogTitle>
          <DialogDescription>
            Configure your chat experience with model selection and personality settings.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6 py-4">
          {/* Model Selection */}
          <div className="space-y-2">
            <Label>AI Model</Label>
            <ModelSelector
              selectedModel={preferences.model}
              onModelChange={(model) => updatePreference('model', model)}
            />
            <p className="text-xs text-muted-foreground">
              Choose the AI model for your conversations. Different models have different capabilities and costs.
            </p>
          </div>

          <Separator />

          {/* Personality Selection */}
          <div className="space-y-2">
            <Label>Assistant Personality</Label>
            <PersonalitySelector
              selectedPersonality={preferences.personality}
              onPersonalityChange={(personality) => updatePreference('personality', personality)}
            />
            <p className="text-xs text-muted-foreground">
              Select the personality mode for your AI assistant.
            </p>
          </div>

          <Separator />

          {/* Debug Mode */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <Label htmlFor="debug-mode">Debug Mode</Label>
              <Badge variant={preferences.debugMode ? "default" : "outline"}>
                {preferences.debugMode ? "Enabled" : "Disabled"}
              </Badge>
            </div>
            <div className="flex items-center space-x-2">
              <input
                type="checkbox"
                id="debug-mode"
                checked={preferences.debugMode}
                onChange={(e) => updatePreference('debugMode', e.target.checked)}
                className="h-4 w-4 rounded border-gray-300"
              />
              <label htmlFor="debug-mode" className="text-sm text-muted-foreground">
                Show memory operations and system information in chat
              </label>
            </div>
          </div>

          <Separator />

          {/* Current Settings Summary */}
          <div className="rounded-lg bg-muted p-3 space-y-1">
            <p className="text-sm font-medium">Current Settings:</p>
            <div className="text-xs space-y-1">
              <p>• Model: {preferences.model.split('/').pop()}</p>
              <p>• Personality: {preferences.personality}</p>
              <p>• Debug Mode: {preferences.debugMode ? 'On' : 'Off'}</p>
            </div>
          </div>
        </div>

        <div className="flex justify-between">
          <Button variant="outline" onClick={handleReset}>
            <RotateCcw className="mr-2 h-4 w-4" />
            Reset to Defaults
          </Button>
          <Button onClick={handleSave} disabled={!isDirty}>
            <Save className="mr-2 h-4 w-4" />
            Save Preferences
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}