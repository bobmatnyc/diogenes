import { isDevelopment } from './env';

const FIXED_PASSWORD = process.env.NEXT_PUBLIC_APP_PASSWORD || 'diogenes2024';

export function validatePassword(password: string): boolean {
  // Bypass password check in development
  if (isDevelopment()) {
    return true;
  }
  return password === FIXED_PASSWORD;
}

export function isAuthenticated(): boolean {
  if (typeof window === 'undefined') return false;
  
  // Auto-authenticate in development mode
  if (isDevelopment()) {
    return true;
  }
  
  const authToken = localStorage.getItem('auth_token');
  const authExpiry = localStorage.getItem('auth_expiry');
  
  if (!authToken || !authExpiry) return false;
  
  const now = new Date().getTime();
  const expiry = parseInt(authExpiry, 10);
  
  if (now > expiry) {
    localStorage.removeItem('auth_token');
    localStorage.removeItem('auth_expiry');
    return false;
  }
  
  return authToken === 'authenticated';
}

export function login(password: string): boolean {
  // Auto-login in development mode
  if (isDevelopment()) {
    // Still set the token for consistency, but it won't be checked
    const now = new Date().getTime();
    const expiryTime = now + (24 * 60 * 60 * 1000); // 24 hours
    
    localStorage.setItem('auth_token', 'authenticated');
    localStorage.setItem('auth_expiry', expiryTime.toString());
    
    return true;
  }
  
  if (!validatePassword(password)) {
    return false;
  }
  
  const now = new Date().getTime();
  const expiryTime = now + (24 * 60 * 60 * 1000); // 24 hours
  
  localStorage.setItem('auth_token', 'authenticated');
  localStorage.setItem('auth_expiry', expiryTime.toString());
  
  return true;
}

export function logout(): void {
  localStorage.removeItem('auth_token');
  localStorage.removeItem('auth_expiry');
  localStorage.removeItem('chat_session');
}