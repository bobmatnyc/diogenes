/**
 * Version tracking and build information module for Diogenes
 * Provides semantic versioning, build metadata, and environment tracking
 * Edge runtime compatible version
 */

// Static version from package.json (will be updated at build time)
const PACKAGE_VERSION = '0.2.3';

/**
 * Parse semantic version into components
 */
function parseVersion(version: string): {
  major: number;
  minor: number;
  patch: number;
  prerelease?: string;
} {
  const match = version.match(/^(\d+)\.(\d+)\.(\d+)(?:-(.+))?$/);
  if (!match) {
    return { major: 0, minor: 0, patch: 0 };
  }
  
  return {
    major: parseInt(match[1], 10),
    minor: parseInt(match[2], 10),
    patch: parseInt(match[3], 10),
    prerelease: match[4]
  };
}

/**
 * Get the build timestamp
 */
function getBuildTimestamp(): string {
  return new Date().toISOString();
}

/**
 * Determine the deployment environment
 */
function getEnvironment(): 'development' | 'staging' | 'production' {
  if (typeof process !== 'undefined' && process.env) {
    if (process.env.NODE_ENV === 'production') {
      if (process.env.VERCEL_ENV === 'production') {
        return 'production';
      }
      if (process.env.VERCEL_ENV === 'preview') {
        return 'staging';
      }
      return 'production';
    }
  }
  return 'development';
}

/**
 * Generate a unique build ID
 * Format: YYYYMMDD-HHMMSS
 */
function generateBuildId(): string {
  const now = new Date();
  const dateStr = now.toISOString().slice(0, 10).replace(/-/g, '');
  const timeStr = now.toISOString().slice(11, 19).replace(/:/g, '');
  
  // In edge runtime, we can't get git commit, so use a random suffix
  const randomSuffix = Math.random().toString(36).substring(2, 9);
  
  return `${dateStr}-${timeStr}-${randomSuffix}`;
}

/**
 * Main version information object
 */
export const VERSION_INFO = {
  // Semantic version
  version: PACKAGE_VERSION,
  
  // Parsed version components
  ...parseVersion(PACKAGE_VERSION),
  
  // Build metadata
  build: {
    id: generateBuildId(),
    timestamp: getBuildTimestamp(),
    // Git information not available in edge runtime
    commit: process.env.VERCEL_GIT_COMMIT_SHA?.slice(0, 7) || 'unknown',
    branch: process.env.VERCEL_GIT_COMMIT_REF || 'unknown',
    dirty: false, // Can't determine in edge runtime
  },
  
  // Environment information
  environment: getEnvironment(),
  
  // Feature flags and capabilities
  features: {
    webSearch: true,
    tokenTracking: true,
    streamingResponses: true,
    multiAgent: true,
    perplexityIntegration: true,
    antiSycophancy: false, // Temporarily disabled for stability
    customChatInterface: true, // New custom implementation
    fixedMessagePersistence: true, // Messages no longer disappear after streaming
  },
  
  // Project metadata
  project: {
    name: 'Diogenes',
    description: 'The contrarian AI chatbot',
    author: 'Diogenes Development Team',
    repository: 'https://github.com/your-org/diogenes',
  },
  
  // Runtime information (limited in edge runtime)
  runtime: {
    node: typeof process !== 'undefined' ? process.version : 'edge',
    platform: 'edge',
    arch: 'unknown',
    pid: 0,
    uptime: () => 0, // Not available in edge runtime
  },
};

/**
 * Get a formatted version string for display
 * Examples:
 * - Development: "v0.1.0-dev"
 * - Production: "v0.1.0"
 * - Staging: "v0.1.0-staging"
 */
export function getFormattedVersion(): string {
  const { version } = VERSION_INFO;
  const { environment, build } = VERSION_INFO;
  
  let formatted = `v${version}`;
  
  if (environment === 'development') {
    formatted += `-dev`;
    if (build.commit !== 'unknown') {
      formatted += `.${build.commit}`;
    }
  } else if (environment === 'staging') {
    formatted += `-staging`;
    if (build.commit !== 'unknown') {
      formatted += `.${build.commit}`;
    }
  }
  
  return formatted;
}

/**
 * Get a short version string for compact display
 * Examples: "0.1.0", "0.1.0-dev"
 */
export function getShortVersion(): string {
  const { version } = VERSION_INFO;
  const { environment } = VERSION_INFO;
  
  if (environment === 'development') {
    return `${version}-dev`;
  }
  
  return version;
}

/**
 * Get version information as HTTP headers
 */
export function getVersionHeaders(): Record<string, string> {
  return {
    'X-Version': VERSION_INFO.version,
    'X-Build-Id': VERSION_INFO.build.id,
    'X-Environment': VERSION_INFO.environment,
    'X-Commit': VERSION_INFO.build.commit,
  };
}

/**
 * Get a complete version report object
 * Useful for health checks and debugging
 */
export function getVersionReport() {
  return {
    version: getFormattedVersion(),
    semantic: {
      major: VERSION_INFO.major,
      minor: VERSION_INFO.minor,
      patch: VERSION_INFO.patch,
      prerelease: VERSION_INFO.prerelease,
    },
    build: VERSION_INFO.build,
    environment: VERSION_INFO.environment,
    features: VERSION_INFO.features,
    runtime: {
      node: VERSION_INFO.runtime.node,
      platform: VERSION_INFO.runtime.platform,
      arch: VERSION_INFO.runtime.arch,
    },
    timestamp: new Date().toISOString(),
  };
}

/**
 * Check if current version satisfies a requirement
 * @param requirement Semver requirement string (e.g., ">=0.1.0")
 */
export function satisfiesVersion(requirement: string): boolean {
  // Simple implementation for basic comparisons
  const operators = ['>=', '<=', '>', '<', '='];
  let operator = '=';
  let requiredVersion = requirement;
  
  for (const op of operators) {
    if (requirement.startsWith(op)) {
      operator = op;
      requiredVersion = requirement.slice(op.length).trim();
      break;
    }
  }
  
  const current = parseVersion(VERSION_INFO.version);
  const required = parseVersion(requiredVersion);
  
  const currentValue = current.major * 10000 + current.minor * 100 + current.patch;
  const requiredValue = required.major * 10000 + required.minor * 100 + required.patch;
  
  switch (operator) {
    case '>=':
      return currentValue >= requiredValue;
    case '<=':
      return currentValue <= requiredValue;
    case '>':
      return currentValue > requiredValue;
    case '<':
      return currentValue < requiredValue;
    case '=':
    default:
      return currentValue === requiredValue;
  }
}

// Export for use in other modules
export default VERSION_INFO;