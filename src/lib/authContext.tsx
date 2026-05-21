import React, { createContext, useContext } from 'react';
import { useUser, useClerk } from '@clerk/clerk-react';

// Minimal user shape consumers care about. Kept stable so swapping auth
// providers again doesn't ripple through the app.
export interface AuthUser {
  id: string;
  email: string | null;
}

interface AuthContextType {
  user: AuthUser | null;
  loading: boolean;
  signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType>({
  user: null,
  loading: true,
  signOut: async () => {},
});

export const useAuth = () => useContext(AuthContext);

const hasClerk = Boolean(import.meta.env.VITE_CLERK_PUBLISHABLE_KEY);

// Clerk hooks throw outside a ClerkProvider, so isolate them in a child
// component that only mounts when the publishable key is configured.
const ClerkAuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { user: clerkUser, isLoaded } = useUser();
  const { signOut: clerkSignOut } = useClerk();

  const user: AuthUser | null = clerkUser
    ? {
        id: clerkUser.id,
        email: clerkUser.primaryEmailAddress?.emailAddress ?? null,
      }
    : null;

  const signOut = async () => {
    await clerkSignOut();
  };

  return (
    <AuthContext.Provider value={{ user, loading: !isLoaded, signOut }}>
      {children}
    </AuthContext.Provider>
  );
};

const NoAuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => (
  <AuthContext.Provider value={{ user: null, loading: false, signOut: async () => {} }}>
    {children}
  </AuthContext.Provider>
);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) =>
  hasClerk ? <ClerkAuthProvider>{children}</ClerkAuthProvider> : <NoAuthProvider>{children}</NoAuthProvider>;
