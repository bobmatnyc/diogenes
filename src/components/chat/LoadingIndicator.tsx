'use client';

import { useEffect, useState } from 'react';
import { Activity, Search, Brain, Cpu, MessageSquare, Network, Database, Zap } from 'lucide-react';

interface LoadingIndicatorProps {
  searchDelegated?: boolean;
  contextTokens?: number;
  maxContextTokens?: number;
}

interface LoadingPhase {
  icon: React.ReactNode;
  message: string;
  technical: string;
  duration: number; // milliseconds before transitioning to next phase
}

export default function LoadingIndicator({ 
  searchDelegated = false,
  contextTokens = 0,
  maxContextTokens = 128000 
}: LoadingIndicatorProps) {
  const [currentPhaseIndex, setCurrentPhaseIndex] = useState(0);
  const contextUsagePercent = maxContextTokens > 0 ? Math.round((contextTokens / maxContextTokens) * 100) : 0;

  // Define loading phases based on technical operations
  const getLoadingPhases = (): LoadingPhase[] => {
    if (searchDelegated) {
      // When performing web search with delegation
      return [
        {
          icon: <Brain className="h-4 w-4 text-white" />,
          message: "Analyzing intent",
          technical: "Delegation analysis via Claude 3.5 Sonnet",
          duration: 1500
        },
        {
          icon: <Network className="h-4 w-4 text-white" />,
          message: "Routing to search agent",
          technical: "OpenRouter → Perplexity Sonar Pro",
          duration: 1000
        },
        {
          icon: <Search className="h-4 w-4 text-white" />,
          message: "Executing web search",
          technical: "Real-time information retrieval",
          duration: 3000
        },
        {
          icon: <Database className="h-4 w-4 text-white" />,
          message: "Processing search results",
          technical: "Context injection & deduplication",
          duration: 2000
        },
        {
          icon: <Cpu className="h-4 w-4 text-white" />,
          message: "Generating response",
          technical: "Streaming via Edge Runtime",
          duration: 2000
        }
      ];
    }

    // Standard LLM processing
    return [
      {
        icon: <Activity className="h-4 w-4 text-white" />,
        message: "Establishing connection",
        technical: "OpenRouter API handshake",
        duration: 1000
      },
      {
        icon: <Brain className="h-4 w-4 text-white" />,
        message: "Processing context",
        technical: `${contextTokens.toLocaleString()} tokens (${contextUsagePercent}% capacity)`,
        duration: 2000
      },
      {
        icon: <Cpu className="h-4 w-4 text-white" />,
        message: "Model inference",
        technical: "Transformer attention computation",
        duration: 2500
      },
      {
        icon: <Zap className="h-4 w-4 text-white" />,
        message: "Streaming response",
        technical: "Server-sent events via Edge Runtime",
        duration: 2000
      }
    ];
  };

  const phases = getLoadingPhases();
  const currentPhase = phases[currentPhaseIndex] || phases[phases.length - 1];

  useEffect(() => {
    // Cycle through phases
    const timer = setTimeout(() => {
      setCurrentPhaseIndex((prev) => (prev + 1) % phases.length);
    }, currentPhase.duration);

    return () => clearTimeout(timer);
  }, [currentPhaseIndex, currentPhase.duration, phases.length]);

  return (
    <div className="flex items-center gap-3 text-muted-foreground">
      <div className="h-8 w-8 rounded-full bg-gradient-to-br from-amber-600 to-amber-700 flex items-center justify-center animate-pulse">
        {currentPhase.icon}
      </div>
      <div className="flex flex-col gap-0.5">
        <div className="flex items-center gap-2">
          <span className="text-sm font-medium animate-fade-in">
            {currentPhase.message}
          </span>
          <div className="flex gap-0.5">
            <span className="animate-pulse">.</span>
            <span className="animate-pulse animation-delay-100">.</span>
            <span className="animate-pulse animation-delay-200">.</span>
          </div>
        </div>
        <span className="text-xs text-muted-foreground/70 font-mono">
          {currentPhase.technical}
        </span>
      </div>
    </div>
  );
}