'use client';

import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import { Archive, Info, Zap } from 'lucide-react';
import { cn } from '@/lib/utils';

interface ContextStatusProps {
  tokens: number;
  maxTokens: number;
  percent: number;
  wasCompacted: boolean;
  summaryCount: number;
}

export default function ContextStatus({
  tokens,
  maxTokens,
  percent,
  wasCompacted,
  summaryCount,
}: ContextStatusProps) {
  // Determine status level
  const getStatusLevel = () => {
    if (percent < 60) return 'good';
    if (percent < 80) return 'warning';
    return 'critical';
  };

  const statusLevel = getStatusLevel();
  const statusColors = {
    good: 'text-green-600 bg-green-50',
    warning: 'text-amber-600 bg-amber-50',
    critical: 'text-red-600 bg-red-50',
  };

  const progressColors = {
    good: 'bg-green-500',
    warning: 'bg-amber-500',
    critical: 'bg-red-500',
  };

  return (
    <TooltipProvider>
      <div className="flex items-center gap-2 px-3 py-2 rounded-lg border bg-card">
        {/* Icon and Label */}
        <div className="flex items-center gap-1.5">
          <Zap className="h-3.5 w-3.5 text-muted-foreground" />
          <span className="text-xs font-medium text-muted-foreground">Context</span>
        </div>

        {/* Progress Bar */}
        <div className="flex-1 max-w-[100px]">
          <Progress
            value={percent}
            className="h-1.5"
            indicatorClassName={progressColors[statusLevel]}
          />
        </div>

        {/* Percentage Badge */}
        <Badge
          variant="outline"
          className={cn('text-xs px-1.5 py-0', statusColors[statusLevel])}
        >
          {percent.toFixed(0)}%
        </Badge>

        {/* Compaction Indicator */}
        {wasCompacted && (
          <Tooltip>
            <TooltipTrigger asChild>
              <Badge
                variant="secondary"
                className="text-xs px-1.5 py-0 flex items-center gap-1"
              >
                <Archive className="h-3 w-3" />
                {summaryCount}
              </Badge>
            </TooltipTrigger>
            <TooltipContent>
              <p className="text-xs">
                {summaryCount} conversation {summaryCount === 1 ? 'summary' : 'summaries'} active
              </p>
            </TooltipContent>
          </Tooltip>
        )}

        {/* Info Tooltip */}
        <Tooltip>
          <TooltipTrigger asChild>
            <Info className="h-3.5 w-3.5 text-muted-foreground cursor-help" />
          </TooltipTrigger>
          <TooltipContent className="max-w-xs">
            <div className="space-y-2 text-xs">
              <p className="font-semibold">Context Window Usage</p>
              <p>
                Using {tokens.toLocaleString()} of {maxTokens.toLocaleString()} tokens
              </p>
              {wasCompacted && (
                <>
                  <div className="border-t pt-2 mt-2">
                    <p className="font-semibold">Context Compaction Active</p>
                    <p>
                      Older messages have been summarized to save space.
                      {summaryCount > 0 && ` ${summaryCount} summaries are being used to maintain context.`}
                    </p>
                  </div>
                </>
              )}
              <div className="border-t pt-2 mt-2">
                <p className="text-xs opacity-75">
                  {percent < 60 && 'Plenty of space available'}
                  {percent >= 60 && percent < 80 && 'Context will be compacted soon'}
                  {percent >= 80 && 'Context is being actively managed'}
                </p>
              </div>
            </div>
          </TooltipContent>
        </Tooltip>
      </div>
    </TooltipProvider>
  );
}