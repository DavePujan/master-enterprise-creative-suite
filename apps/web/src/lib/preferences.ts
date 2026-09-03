/**
 * Centralized Preferences and Session Persistence Utility
 * Manages user UI preferences across Cookies, LocalStorage, and in-memory state.
 */

export interface UserPreferences {
  theme: 'dark' | 'light' | 'system';
  sidebarOpen: boolean;
  aspectRatio: string;
  audioVolume: number;
  audioVoice: string;
  bakeLogoOnGeneration: boolean;
  logoPosition: { x: number; y: number };
  logoScale: number;
  logoInverted: boolean;
  activeProfileId?: string;
  brandSetupComplete?: boolean;
  brandGuidelines?: any;
}

export const DEFAULT_PREFERENCES: UserPreferences = {
  theme: 'system',
  sidebarOpen: true,
  aspectRatio: '1:1',
  audioVolume: 0.8,
  audioVoice: 'Puck',
  bakeLogoOnGeneration: true,
  logoPosition: { x: 15, y: 15 },
  logoScale: 15,
  logoInverted: false,
  activeProfileId: 'default',
  brandSetupComplete: false,
  brandGuidelines: null
};

const COOKIE_PREFIX = 'writo_pref_';
const STORAGE_KEY = 'writopedia_user_preferences_v1';
const COOKIE_MAX_AGE_DAYS = 365;

// ==========================================
// Cookie Helper Methods
// ==========================================

export function getCookie(name: string): string | null {
  if (typeof document === 'undefined') return null;
  const key = `${name}=`;
  const cookies = document.cookie.split(';');
  for (let i = 0; i < cookies.length; i++) {
    let c = cookies[i].trim();
    if (c.indexOf(key) === 0) {
      return decodeURIComponent(c.substring(key.length));
    }
  }
  return null;
}

export function setCookie(name: string, value: string, days = COOKIE_MAX_AGE_DAYS): void {
  if (typeof document === 'undefined') return;
  const expires = new Date(Date.now() + days * 864e5).toUTCString();
  const isSecure = typeof window !== 'undefined' && window.location.protocol === 'https:';
  document.cookie = `${name}=${encodeURIComponent(value)}; expires=${expires}; path=/; SameSite=Lax${isSecure ? '; Secure' : ''}`;
}

export function deleteCookie(name: string): void {
  if (typeof document === 'undefined') return;
  document.cookie = `${name}=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/; SameSite=Lax;`;
}

// ==========================================
// Preferences Loader & Saver
// ==========================================

export function loadPreferences(): UserPreferences {
  const prefs: UserPreferences = { ...DEFAULT_PREFERENCES };

  // 1. Try to load structured JSON from localStorage
  if (typeof window !== 'undefined' && window.localStorage) {
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      if (stored) {
        const parsed = JSON.parse(stored);
        Object.assign(prefs, parsed);
      }
    } catch (e) {
      console.warn("Failed to parse stored preferences from localStorage:", e);
    }
  }

  // 2. Cookie fallback / override
  const cookieTheme = getCookie(`${COOKIE_PREFIX}theme`);
  if (cookieTheme === 'dark' || cookieTheme === 'light' || cookieTheme === 'system') {
    prefs.theme = cookieTheme;
  }

  const cookieSidebar = getCookie(`${COOKIE_PREFIX}sidebar`);
  if (cookieSidebar !== null) {
    prefs.sidebarOpen = cookieSidebar === '1';
  }

  const cookieRatio = getCookie(`${COOKIE_PREFIX}aspect_ratio`);
  if (cookieRatio) {
    prefs.aspectRatio = cookieRatio;
  }

  const cookieBrandSetup = getCookie(`${COOKIE_PREFIX}brand_setup`);
  if (cookieBrandSetup !== null) {
    prefs.brandSetupComplete = cookieBrandSetup === '1';
  }

  return prefs;
}

export function savePreferences(prefs: Partial<UserPreferences>): void {
  if (typeof window === 'undefined') return;

  try {
    const current = loadPreferences();
    const updated = { ...current, ...prefs };

    // 1. Save to localStorage
    if (window.localStorage) {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
    }

    // 2. Sync core preferences to cookies for server/client continuity
    if (prefs.theme !== undefined) {
      setCookie(`${COOKIE_PREFIX}theme`, prefs.theme);
      setCookie('theme', prefs.theme); // Generic theme cookie
    }
    if (prefs.sidebarOpen !== undefined) {
      setCookie(`${COOKIE_PREFIX}sidebar`, prefs.sidebarOpen ? '1' : '0');
    }
    if (prefs.aspectRatio !== undefined) {
      setCookie(`${COOKIE_PREFIX}aspect_ratio`, prefs.aspectRatio);
    }
    if (prefs.activeProfileId !== undefined) {
      setCookie(`${COOKIE_PREFIX}active_profile`, prefs.activeProfileId);
    }
    if (prefs.brandSetupComplete !== undefined) {
      setCookie(`${COOKIE_PREFIX}brand_setup`, prefs.brandSetupComplete ? '1' : '0');
    }

    // 3. Dispatch storage event for same-tab & cross-tab synchronization
    window.dispatchEvent(new CustomEvent('preferences-changed', { detail: updated }));
  } catch (e) {
    console.error("Failed to save user preferences:", e);
  }
}

// ==========================================
// Theme Resolver & DOM Applicator
// ==========================================

export function resolveIsDark(themePreference: 'dark' | 'light' | 'system'): boolean {
  if (themePreference === 'dark') return true;
  if (themePreference === 'light') return false;
  if (typeof window !== 'undefined' && window.matchMedia) {
    return window.matchMedia('(prefers-color-scheme: dark)').matches;
  }
  return false;
}

export function applyThemeToDocument(isDark: boolean): void {
  if (typeof document === 'undefined') return;
  if (isDark) {
    document.documentElement.classList.add('dark');
  } else {
    document.documentElement.classList.remove('dark');
  }
}
