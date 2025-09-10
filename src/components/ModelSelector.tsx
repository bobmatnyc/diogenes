'use client';

import { useEffect, useState } from 'react';
import { AVAILABLE_MODELS, DEFAULT_MODEL_ID, type AIModel } from '@/types/chat';

interface ModelSelectorProps {
  selectedModel: string;
  onModelChange: (modelId: string) => void;
  className?: string;
}

export default function ModelSelector({ selectedModel, onModelChange, className = '' }: ModelSelectorProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [currentModel, setCurrentModel] = useState<AIModel | undefined>();

  useEffect(() => {
    const model = AVAILABLE_MODELS.find(m => m.id === selectedModel);
    setCurrentModel(model);
  }, [selectedModel]);

  const handleModelSelect = (modelId: string) => {
    onModelChange(modelId);
    setIsOpen(false);
    
    // Save to localStorage
    localStorage.setItem('preferredModel', modelId);
  };

  return (
    <div className={`relative ${className}`}>
      {/* Dropdown Button */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center gap-2 px-3 py-1.5 bg-muted hover:bg-muted/80 border border-border rounded-lg transition-colors text-foreground text-sm"
        title="Select AI model"
      >
        <svg 
          className="w-4 h-4" 
          fill="none" 
          stroke="currentColor" 
          viewBox="0 0 24 24"
        >
          <path 
            strokeLinecap="round" 
            strokeLinejoin="round" 
            strokeWidth={2} 
            d="M9 3v2m6-2v2M9 19v2m6-2v2M5 9H3m2 6H3m18-6h-2m2 6h-2M7 19h10a2 2 0 002-2V7a2 2 0 00-2-2H7a2 2 0 00-2 2v10a2 2 0 002 2zM9 9h6v6H9V9z" 
          />
        </svg>
        <span className="hidden sm:inline">
          {currentModel?.name || 'Select Model'}
        </span>
        <span className="sm:hidden">
          {currentModel?.provider || 'Model'}
        </span>
        <svg
          className={`w-4 h-4 transition-transform ${isOpen ? 'rotate-180' : ''}`}
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
        </svg>
      </button>

      {/* Dropdown Menu */}
      {isOpen && (
        <>
          {/* Backdrop */}
          <div
            className="fixed inset-0 z-10"
            onClick={() => setIsOpen(false)}
          />
          
          {/* Menu */}
          <div className="absolute right-0 mt-2 w-72 bg-white dark:bg-gray-800 rounded-lg shadow-xl z-20 overflow-hidden">
            <div className="p-2">
              <div className="text-xs text-gray-500 dark:text-gray-400 px-3 py-1 font-semibold uppercase">
                Select AI Model
              </div>
              {AVAILABLE_MODELS.map((model) => (
                <button
                  key={model.id}
                  onClick={() => handleModelSelect(model.id)}
                  className={`w-full text-left px-3 py-2 rounded-md transition-colors ${
                    selectedModel === model.id
                      ? 'bg-primary text-primary-foreground'
                      : 'hover:bg-gray-100 dark:hover:bg-gray-700'
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <div>
                      <div className="font-medium text-sm">{model.name}</div>
                      <div className="text-xs text-gray-500 dark:text-gray-400">
                        {model.provider}
                      </div>
                      {model.description && (
                        <div className="text-xs text-gray-400 dark:text-gray-500 mt-0.5">
                          {model.description}
                        </div>
                      )}
                    </div>
                    {selectedModel === model.id && (
                      <svg
                        className="w-4 h-4 text-white flex-shrink-0 ml-2"
                        fill="currentColor"
                        viewBox="0 0 20 20"
                      >
                        <path
                          fillRule="evenodd"
                          d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z"
                          clipRule="evenodd"
                        />
                      </svg>
                    )}
                  </div>
                </button>
              ))}
            </div>
            
            {/* Footer with info */}
            <div className="border-t dark:border-gray-700 px-3 py-2 bg-gray-50 dark:bg-gray-900">
              <p className="text-xs text-gray-500 dark:text-gray-400">
                All models maintain Diogenes' philosophical personality
              </p>
            </div>
          </div>
        </>
      )}
    </div>
  );
}