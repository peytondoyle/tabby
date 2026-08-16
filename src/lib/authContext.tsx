import React, { createContext, useContext } from 'react';

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

export const AuthContext = createContext<AuthContextType>({
  user: null,
  loading: true,
  signOut: async () => {},
});

export const useAuth = () => useContext(AuthContext);

const hasClerk = Boolean(import.meta.env.VITE_CLERK_PUBLISHABLE_KEY);

const ClerkAuthProvider = React.lazy(() =>
  import('./clerkAuthProvider').then(module => ({ default: module.ClerkAuthProvider }))
);

const NoAuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => (
  <AuthContext.Provider value={{ user: null, loading: false, signOut: async () => {} }}>
    {children}
  </AuthContext.Provider>
);

const AuthLoadingProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => (
  <AuthContext.Provider value={{ user: null, loading: true, signOut: async () => {} }}>
    {children}
  </AuthContext.Provider>
);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) =>
  hasClerk ? (
    <React.Suspense fallback={<AuthLoadingProvider>{children}</AuthLoadingProvider>}>
      <ClerkAuthProvider>{children}</ClerkAuthProvider>
    </React.Suspense>
  ) : (
    <NoAuthProvider>{children}</NoAuthProvider>
  );
