import { initializeApp, getApps, getApp } from 'firebase/app';
import {
  getAuth,
  signInWithPopup,
  signInWithCredential,
  GoogleAuthProvider,
  onAuthStateChanged,
  User,
  signOut,
} from 'firebase/auth';
import firebaseConfig from '../../firebase-applet-config.json';

// Initialize Firebase App only once
const app = getApps().length === 0 ? initializeApp(firebaseConfig) : getApp();
export const auth = getAuth(app);

export interface AppUser {
  uid: string;
  email: string | null;
  displayName: string | null;
  photoURL?: string | null;
}

const provider = new GoogleAuthProvider();
// Workspace scopes for reading and writing spreadsheets & drive files
provider.addScope('https://www.googleapis.com/auth/spreadsheets');
provider.addScope('https://www.googleapis.com/auth/drive.file');
provider.setCustomParameters({ prompt: 'select_account' });

// Access token persistence so page reloads don't drop the token immediately
const TOKEN_KEY = 'pos_google_access_token';
const TOKEN_TIME_KEY = 'pos_google_token_time';
const TOKEN_EXPIRY_MS = 3300000; // 55 minutes

let cachedAccessToken: string | null = null;
let cachedUser: AppUser | User | null = null;
let isSigningIn = false;
let activeSignInPromise: Promise<{ user: AppUser | User; accessToken: string } | null> | null = null;

const loadPersistedToken = () => {
  try {
    const token = localStorage.getItem(TOKEN_KEY);
    const time = localStorage.getItem(TOKEN_TIME_KEY);
    if (token && time) {
      const elapsed = Date.now() - parseInt(time, 10);
      if (elapsed < TOKEN_EXPIRY_MS) {
        cachedAccessToken = token;
        return token;
      } else {
        localStorage.removeItem(TOKEN_KEY);
        localStorage.removeItem(TOKEN_TIME_KEY);
      }
    }
  } catch (e) {
    console.warn('Could not read token from localStorage', e);
  }
  return null;
};
loadPersistedToken();

const persistToken = (token: string | null) => {
  cachedAccessToken = token;
  try {
    if (token) {
      localStorage.setItem(TOKEN_KEY, token);
      localStorage.setItem(TOKEN_TIME_KEY, Date.now().toString());
    } else {
      localStorage.removeItem(TOKEN_KEY);
      localStorage.removeItem(TOKEN_TIME_KEY);
    }
  } catch (e) {
    console.warn('Could not save token to localStorage', e);
  }
};

let authSuccessCallbacks: Array<(user: AppUser | User, token: string) => void> = [];
let authFailureCallbacks: Array<() => void> = [];

/**
 * Ensures the Google Identity Services client script is loaded
 */
const loadGsiScript = (): Promise<void> => {
  if (typeof window === 'undefined') return Promise.resolve();
  if ((window as any).google?.accounts?.oauth2) return Promise.resolve();

  return new Promise((resolve) => {
    const existing = document.querySelector('script[src="https://accounts.google.com/gsi/client"]');
    if (existing) {
      existing.addEventListener('load', () => resolve());
      existing.addEventListener('error', () => resolve());
      if ((window as any).google?.accounts?.oauth2) {
        resolve();
      }
      setTimeout(resolve, 3000);
      return;
    }

    const script = document.createElement('script');
    script.src = 'https://accounts.google.com/gsi/client';
    script.async = true;
    script.defer = true;
    script.onload = () => resolve();
    script.onerror = () => resolve();
    document.head.appendChild(script);

    setTimeout(resolve, 3000);
  });
};

/**
 * Sign in directly using Google Identity Services (GSI) Token Client.
 * This connects directly to accounts.google.com, bypassing third-party cookie restrictions
 * in iframe and cross-origin environments that break Firebase authDomain popups.
 */
const signInWithGsi = async (): Promise<{ user: AppUser; accessToken: string } | null> => {
  await loadGsiScript();

  const google = (window as any).google;
  if (!google?.accounts?.oauth2) {
    throw new Error('Google Identity Services library is not available');
  }

  const clientId = firebaseConfig.oAuthClientId;
  if (!clientId) {
    throw new Error('Missing Google OAuth Client ID in configuration');
  }

  return new Promise((resolve, reject) => {
    let settled = false;

    try {
      const tokenClient = google.accounts.oauth2.initTokenClient({
        client_id: clientId,
        scope: 'https://www.googleapis.com/auth/spreadsheets https://www.googleapis.com/auth/drive.file email profile openid',
        callback: async (tokenResponse: any) => {
          if (settled) return;
          settled = true;

          if (tokenResponse.error) {
            if (tokenResponse.error === 'access_denied') {
              resolve(null);
            } else {
              reject(new Error(tokenResponse.error_description || tokenResponse.error));
            }
            return;
          }

          const accessToken = tokenResponse.access_token;
          if (!accessToken) {
            reject(new Error('Google access token was not returned'));
            return;
          }

          persistToken(accessToken);

          // Fetch user profile from Google UserInfo endpoint
          let user: AppUser = {
            uid: 'google-user',
            email: null,
            displayName: null,
            photoURL: null,
          };

          try {
            const userinfoRes = await fetch('https://www.googleapis.com/oauth2/v3/userinfo', {
              headers: { Authorization: `Bearer ${accessToken}` },
            });
            if (userinfoRes.ok) {
              const info = await userinfoRes.json();
              user = {
                uid: info.sub || 'google-user',
                email: info.email || null,
                displayName: info.name || null,
                photoURL: info.picture || null,
              };
            }
          } catch (fetchErr) {
            console.warn('Could not retrieve user info from Google:', fetchErr);
          }

          // Also attempt to sync Firebase Auth credential in background (optional, safe against iframe cookie blocks)
          try {
            const credential = GoogleAuthProvider.credential(null, accessToken);
            const fbRes = await signInWithCredential(auth, credential);
            if (fbRes?.user) {
              user = {
                uid: fbRes.user.uid,
                email: fbRes.user.email,
                displayName: fbRes.user.displayName,
                photoURL: fbRes.user.photoURL,
              };
            }
          } catch (fbErr) {
            console.warn('Firebase Auth credential sync skipped in iframe:', fbErr);
          }

          cachedUser = user;
          authSuccessCallbacks.forEach((cb) => cb(user, accessToken));
          resolve({ user, accessToken });
        },
        error_callback: (err: any) => {
          if (settled) return;
          settled = true;
          if (err?.type === 'popup_closed') {
            resolve(null);
          } else if (err?.type === 'popup_failed_to_open') {
            reject(new Error('Browser បានរារាំងផ្ទាំង Pop-up។ សូមអនុញ្ញាត Pop-up សម្រាប់គេហទំព័រនេះ។'));
          } else {
            reject(new Error(err?.message || 'ការបើកផ្ទាំង Google Sign-in បានបរាជ័យ'));
          }
        },
      });

      tokenClient.requestAccessToken({ prompt: '' });
    } catch (clientErr) {
      if (!settled) {
        settled = true;
        reject(clientErr);
      }
    }
  });
};

/**
 * Fallback to Firebase signInWithPopup
 */
const signInWithFirebasePopup = async (): Promise<{ user: User; accessToken: string } | null> => {
  const result = await signInWithPopup(auth, provider);
  const credential = GoogleAuthProvider.credentialFromResult(result);
  if (!credential?.accessToken) {
    throw new Error('Failed to get access token from Google');
  }

  persistToken(credential.accessToken);
  cachedUser = result.user;
  authSuccessCallbacks.forEach((cb) => cb(result.user, credential.accessToken!));
  return { user: result.user, accessToken: credential.accessToken };
};

export const initAuth = (
  onAuthSuccess?: (user: AppUser | User, token: string) => void,
  onAuthFailure?: () => void
) => {
  if (onAuthSuccess) authSuccessCallbacks.push(onAuthSuccess);
  if (onAuthFailure) authFailureCallbacks.push(onAuthFailure);

  if (cachedUser && cachedAccessToken && onAuthSuccess) {
    onAuthSuccess(cachedUser, cachedAccessToken);
  }

  const unsubscribe = onAuthStateChanged(auth, async (user: User | null) => {
    if (user) {
      if (cachedAccessToken) {
        cachedUser = user;
        if (onAuthSuccess) onAuthSuccess(user, cachedAccessToken);
      }
    } else {
      if (!isSigningIn && !cachedAccessToken) {
        cachedUser = null;
        if (onAuthFailure) onAuthFailure();
      }
    }
  });

  return () => {
    unsubscribe();
    if (onAuthSuccess) {
      authSuccessCallbacks = authSuccessCallbacks.filter((cb) => cb !== onAuthSuccess);
    }
    if (onAuthFailure) {
      authFailureCallbacks = authFailureCallbacks.filter((cb) => cb !== onAuthFailure);
    }
  };
};

export const googleSignIn = async (): Promise<{ user: AppUser | User; accessToken: string } | null> => {
  // Concurrency guard: if a sign-in is already in flight, reuse the same promise to prevent auth/cancelled-popup-request
  if (activeSignInPromise) {
    return activeSignInPromise;
  }

  activeSignInPromise = (async () => {
    isSigningIn = true;
    try {
      // 1. Try Google Identity Services (GSI) Token Client first
      // GSI directly connects to accounts.google.com and works seamlessly in cross-origin iframes
      try {
        const gsiResult = await signInWithGsi();
        if (gsiResult) {
          return gsiResult;
        }
        // User closed or dismissed popup
        return null;
      } catch (gsiErr: any) {
        console.warn('GSI sign-in had error, attempting Firebase popup fallback:', gsiErr);
      }

      // 2. Fallback to Firebase signInWithPopup
      try {
        const fbResult = await signInWithFirebasePopup();
        return fbResult;
      } catch (fbErr: any) {
        const errMsg = String(fbErr?.message || '');
        const errCode = String(fbErr?.code || '');

        // User intentionally closed or cancelled popup
        if (
          errCode.includes('cancelled-popup-request') ||
          errCode.includes('popup-closed-by-user') ||
          errMsg.includes('popup-closed') ||
          errMsg.includes('cancelled')
        ) {
          console.info('Sign-in popup closed or cancelled by user');
          return null;
        }

        // If Firebase failed due to iframe cookie/network restrictions, give GSI one direct retry
        if (errCode.includes('network-request-failed') || errMsg.includes('network-request-failed')) {
          console.warn('Firebase network-request-failed in iframe. Attempting direct GSI token request...');
          try {
            return await signInWithGsi();
          } catch (retryErr: any) {
            throw new Error('ការភ្ជាប់ទៅកាន់ Google បានជួបបញ្ហាបណ្តាញ ឬ Browser រារាំង Cookie ក្នុង iframe។ សូមបើក Pop-up ក្នុង Browser ឬបើកមើលក្នុងផ្ទាំងថ្មី (New Tab)។');
          }
        }

        throw fbErr;
      }
    } catch (error: any) {
      const msg = String(error?.message || '');
      if (msg.includes('cancelled') || msg.includes('popup_closed') || msg.includes('access_denied')) {
        return null;
      }
      console.error('Google Sign in error:', error);
      throw error;
    } finally {
      isSigningIn = false;
      activeSignInPromise = null;
    }
  })();

  return activeSignInPromise;
};

export const getAccessToken = (): string | null => {
  return cachedAccessToken;
};

export const setAccessToken = (token: string | null) => {
  persistToken(token);
};

export const googleLogout = async () => {
  persistToken(null);
  cachedUser = null;
  try {
    await signOut(auth);
  } catch (err) {
    console.warn('Firebase signOut warning:', err);
  }
  authFailureCallbacks.forEach((cb) => cb());
};

export const googleSignOut = googleLogout;

