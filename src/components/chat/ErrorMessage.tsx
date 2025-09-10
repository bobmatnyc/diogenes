import React from 'react';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { 
  AlertCircle, 
  Lock, 
  Clock, 
  WifiOff, 
  CreditCard, 
  Settings,
  AlertTriangle,
  RefreshCw
} from 'lucide-react';
import { Button } from '@/components/ui/button';

interface ErrorMessageProps {
  type?: string;
  title?: string;
  message: string;
  details?: any;
  onRetry?: () => void;
  isDevelopment?: boolean;
}

const errorIcons: Record<string, React.ReactNode> = {
  AuthenticationError: <Lock className="h-5 w-5" />,
  RateLimitError: <Clock className="h-5 w-5" />,
  NetworkError: <WifiOff className="h-5 w-5" />,
  QuotaExceededError: <CreditCard className="h-5 w-5" />,
  ConfigurationError: <Settings className="h-5 w-5" />,
  TimeoutError: <Clock className="h-5 w-5" />,
  ModelNotFoundError: <AlertTriangle className="h-5 w-5" />,
  default: <AlertCircle className="h-5 w-5" />
};

const errorVariants: Record<string, 'default' | 'destructive'> = {
  AuthenticationError: 'destructive',
  QuotaExceededError: 'destructive',
  ConfigurationError: 'destructive',
  default: 'default'
};

export default function ErrorMessage({ 
  type = 'default',
  title,
  message, 
  details,
  onRetry,
  isDevelopment = false 
}: ErrorMessageProps) {
  const icon = errorIcons[type] || errorIcons.default;
  const variant = errorVariants[type] || errorVariants.default;
  
  // Parse message for special formatting
  const formatMessage = (msg: string) => {
    // Handle markdown-style bold text
    const parts = msg.split(/\*\*(.*?)\*\*/g);
    return parts.map((part, index) => {
      if (index % 2 === 1) {
        return <strong key={index}>{part}</strong>;
      }
      return part;
    });
  };

  // Determine title if not provided
  const errorTitle = title || (() => {
    switch (type) {
      case 'AuthenticationError':
        return 'OpenRouter API Key Invalid';
      case 'RateLimitError':
        return 'Rate Limit Exceeded';
      case 'NetworkError':
        return 'Connection Error';
      case 'QuotaExceededError':
        return 'Insufficient Credits';
      case 'ConfigurationError':
        return 'Configuration Error';
      case 'TimeoutError':
        return 'Request Timeout';
      case 'ModelNotFoundError':
        return 'Model Not Available';
      default:
        return 'Error';
    }
  })();

  return (
    <Alert variant={variant} className="my-4">
      <div className="flex items-start gap-3">
        <div className="mt-0.5">{icon}</div>
        <div className="flex-1">
          <AlertTitle className="text-base font-semibold mb-2">
            {errorTitle}
          </AlertTitle>
          <AlertDescription className="space-y-2">
            <div className="text-sm">
              {formatMessage(message)}
            </div>
            
            {/* Show available models for model errors */}
            {type === 'ModelNotFoundError' && details?.availableModels && (
              <div className="mt-3 p-2 bg-muted rounded-md">
                <p className="text-xs font-medium mb-1">Available models:</p>
                <ul className="text-xs space-y-1">
                  {details.availableModels.map((model: string) => (
                    <li key={model} className="font-mono">• {model}</li>
                  ))}
                </ul>
              </div>
            )}
            
            {/* Show retry after for rate limits */}
            {type === 'RateLimitError' && details?.retryAfter && (
              <div className="mt-2 text-xs text-muted-foreground">
                Retry after: {details.retryAfter} seconds
              </div>
            )}
            
            {/* Show debug info in development */}
            {isDevelopment && details && (
              <details className="mt-3">
                <summary className="text-xs text-muted-foreground cursor-pointer hover:text-foreground">
                  Debug Information
                </summary>
                <pre className="mt-2 p-2 bg-muted rounded-md text-xs overflow-x-auto">
                  {JSON.stringify(details, null, 2)}
                </pre>
              </details>
            )}
            
            {/* Retry button */}
            {onRetry && (
              <div className="mt-3">
                <Button 
                  onClick={onRetry}
                  size="sm"
                  variant="outline"
                  className="gap-2"
                >
                  <RefreshCw className="h-3 w-3" />
                  Try Again
                </Button>
              </div>
            )}
          </AlertDescription>
        </div>
      </div>
    </Alert>
  );
}