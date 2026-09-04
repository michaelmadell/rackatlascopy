import React, { createContext, useContext } from 'react';

export const mockUser = {
  sub: 'auth0|mock-user-1',
  name: 'Michael Madell',
  nickname: 'Michael',
  email: 'info@monkeys3dprints.co.uk',
  email_verified: true,
  picture: 'https://avatar.vercel.sh/michael',
};

const mockAuthValue = {
  isAuthenticated: true,
  isLoading: false,
  user: mockUser,
  loginWithRedirect: async () => {},
  logout: async () => {},
  getAccessTokenSilently: async () => 'mock-dev-access-token',
  getIdTokenClaims: async () => ({ sub: mockUser.sub, email: mockUser.email }),
  loginWithPopup: async () => {},
  handleRedirectCallback: async () => ({ appState: {} }),
  getAccessTokenWithPopup: async () => 'mock-dev-access-token',
};

export const Auth0Context = createContext<any>(mockAuthValue);

export const Auth0Provider: React.FC<any> = ({ children }) => {
  return (
    <Auth0Context.Provider value={mockAuthValue}>
      {children}
    </Auth0Context.Provider>
  );
};

export const useAuth0 = () => useContext(Auth0Context);

export type AppState = Record<string, any>;
export type Auth0ContextInterface = typeof mockAuthValue;
