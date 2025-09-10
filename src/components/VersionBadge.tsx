'use client';

import { useEffect, useState } from 'react';
import { getFormattedVersion, getShortVersion, VERSION_INFO } from '@/lib/version';

interface VersionBadgeProps {
  variant?: 'full' | 'short' | 'minimal';
  showEnvironment?: boolean;
  className?: string;
}

export default function VersionBadge({ 
  variant = 'short',
  showEnvironment = true,
  className = ''
}: VersionBadgeProps) {
  const [version, setVersion] = useState<string>('');
  const [environment, setEnvironment] = useState<string>('');
  const [buildInfo, setBuildInfo] = useState<string>('');

  useEffect(() => {
    // Get version info on client side to avoid hydration issues
    const versionStr = variant === 'full' ? getFormattedVersion() : getShortVersion();
    setVersion(versionStr);
    setEnvironment(VERSION_INFO.environment);
    
    // Format build info for tooltip
    const info = [
      `Build: ${VERSION_INFO.build.id}`,
      `Commit: ${VERSION_INFO.build.commit}`,
      `Branch: ${VERSION_INFO.build.branch}`,
      VERSION_INFO.build.dirty ? 'Has uncommitted changes' : '',
    ].filter(Boolean).join('\n');
    setBuildInfo(info);
  }, [variant]);

  if (!version) {
    return null;
  }

  // Environment color coding
  const envColors = {
    development: 'bg-yellow-500 text-black',
    staging: 'bg-orange-500 text-white',
    production: 'bg-green-500 text-white',
  };

  const envColor = envColors[environment as keyof typeof envColors] || 'bg-gray-500 text-white';

  if (variant === 'minimal') {
    return (
      <span 
        className={`text-xs opacity-60 ${className}`}
        title={buildInfo}
      >
        v{VERSION_INFO.version}
      </span>
    );
  }

  return (
    <div className={`flex items-center gap-2 ${className}`}>
      <span 
        className="text-sm font-mono opacity-75 cursor-help"
        title={buildInfo}
      >
        {version}
      </span>
      {showEnvironment && environment !== 'production' && (
        <span className={`px-2 py-0.5 text-xs font-medium rounded ${envColor}`}>
          {environment.toUpperCase()}
        </span>
      )}
    </div>
  );
}

/**
 * Footer version display component
 * Shows version, build info, and links
 */
export function VersionFooter({ className = '' }: { className?: string }) {
  return (
    <div className={`text-center py-2 text-xs text-gray-500 dark:text-gray-400 ${className}`}>
      <div className="flex items-center justify-center gap-4">
        <VersionBadge variant="full" showEnvironment={true} />
        <a 
          href="/api/version" 
          target="_blank"
          rel="noopener noreferrer"
          className="hover:text-diogenes-primary transition-colors"
        >
          System Info
        </a>
      </div>
    </div>
  );
}