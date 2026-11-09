import { createContext, useContext, useEffect, useState } from 'react';

import { backend } from '@/lib/backend';
import type { Avatar, Profile } from '@/lib/types';

type AuthState = {
  /** `undefined` while the stored session is still being restored. */
  profile: Profile | null | undefined;
  isMock: boolean;
  signIn: (email: string, password: string) => Promise<void>;
  signUp: (email: string, password: string, displayName: string) => Promise<void>;
  signOut: () => Promise<void>;
  updateDisplayName: (name: string) => Promise<void>;
  updateAvatar: (avatar: Avatar | null) => Promise<void>;
};

const AuthContext = createContext<AuthState | null>(null);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [profile, setProfile] = useState<Profile | null | undefined>(undefined);

  useEffect(() => {
    let active = true;
    backend.auth
      .current()
      .then((p) => active && setProfile(p))
      .catch(() => active && setProfile(null));
    const unsubscribe = backend.auth.onChange((p) => active && setProfile(p));
    return () => {
      active = false;
      unsubscribe();
    };
  }, []);

  const value: AuthState = {
    profile,
    isMock: backend.isMock,
    async signIn(email, password) {
      setProfile(await backend.auth.signIn(email, password));
    },
    async signUp(email, password, displayName) {
      setProfile(await backend.auth.signUp(email, password, displayName));
    },
    async signOut() {
      await backend.auth.signOut();
      setProfile(null);
    },
    async updateDisplayName(name) {
      setProfile(await backend.auth.updateDisplayName(name));
    },
    async updateAvatar(avatar) {
      setProfile(await backend.auth.updateAvatar(avatar));
    },
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthState {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used inside <AuthProvider>');
  return ctx;
}

/** The signed-in profile. Only call inside the authenticated route group. */
export function useProfile(): Profile {
  const { profile } = useAuth();
  if (!profile) throw new Error('useProfile requires a signed-in user');
  return profile;
}
