'use client';

import { useState } from 'react';
import { User, Scroll, Briefcase } from 'lucide-react';

export type PersonalityType = 'diogenes' | 'bob' | 'executive';

interface PersonalitySelectorProps {
  selectedPersonality: PersonalityType;
  onPersonalityChange: (personality: PersonalityType) => void;
  className?: string;
}

const personalities = [
  {
    id: 'executive' as PersonalityType,
    name: 'Executive Assistant',
    icon: Briefcase,
    description: 'Professional support with zero sycophancy',
    color: 'text-gray-600',
  },
  {
    id: 'diogenes' as PersonalityType,
    name: 'Diogenes',
    icon: Scroll,
    description: 'The Digital Cynic - Philosophical contrarian',
    color: 'text-amber-600',
  },
  {
    id: 'bob' as PersonalityType,
    name: 'Bob Matsuoka',
    icon: User,
    description: 'Tech leader & AI pioneer',
    color: 'text-blue-600',
  },
];

export default function PersonalitySelector({ 
  selectedPersonality, 
  onPersonalityChange, 
  className = '' 
}: PersonalitySelectorProps) {
  const [isOpen, setIsOpen] = useState(false);
  const currentPersonality = personalities.find(p => p.id === selectedPersonality);

  const handlePersonalitySelect = (personalityId: PersonalityType) => {
    onPersonalityChange(personalityId);
    setIsOpen(false);
    
    // Save to localStorage
    localStorage.setItem('preferredPersonality', personalityId);
  };

  if (!currentPersonality) return null;

  const Icon = currentPersonality.icon;

  return (
    <div className={`relative ${className}`}>
      {/* Dropdown Button */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center gap-2 px-3 py-1.5 bg-muted hover:bg-muted/80 border border-border rounded-lg transition-colors text-foreground text-sm"
        title="Select personality"
      >
        <Icon className={`w-4 h-4 ${currentPersonality.color}`} />
        <span className="hidden sm:inline">
          {currentPersonality.name}
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
                Select Personality
              </div>
              {personalities.map((personality) => {
                const PersonalityIcon = personality.icon;
                return (
                  <button
                    key={personality.id}
                    onClick={() => handlePersonalitySelect(personality.id)}
                    className={`w-full text-left px-3 py-2 rounded-md transition-colors ${
                      selectedPersonality === personality.id
                        ? 'bg-primary text-primary-foreground'
                        : 'hover:bg-gray-100 dark:hover:bg-gray-700'
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      <PersonalityIcon className={`w-5 h-5 ${personality.color}`} />
                      <div className="flex-1">
                        <div className="font-medium text-sm">{personality.name}</div>
                        <div className="text-xs text-gray-500 dark:text-gray-400">
                          {personality.description}
                        </div>
                      </div>
                      {selectedPersonality === personality.id && (
                        <svg
                          className="w-4 h-4 text-primary-foreground flex-shrink-0"
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
                );
              })}
            </div>
            
            {/* Footer with info */}
            <div className="border-t dark:border-gray-700 px-3 py-2 bg-gray-50 dark:bg-gray-900">
              <p className="text-xs text-gray-500 dark:text-gray-400">
                {selectedPersonality === 'executive'
                  ? 'Professional task-focused support with maximum neutrality and zero validation-seeking'
                  : selectedPersonality === 'diogenes'
                  ? 'Philosophical contrarian who challenges conventional thinking'
                  : 'Experienced tech leader with pragmatic, thoughtful insights'
                }
              </p>
            </div>
          </div>
        </>
      )}
    </div>
  );
}