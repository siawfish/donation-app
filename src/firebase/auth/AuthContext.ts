import { createContext, useContext } from 'react';
import { UserInfo } from 'firebase/auth';
import { Claims } from 'next-firebase-auth-edge/lib/auth/claims';
import { AccountTypes, UserTypes } from '@/app/types';

export interface User extends UserInfo {
  idToken: string;
  customToken?: string;
  emailVerified: boolean;
  customClaims: Claims;
  userType: UserTypes;
  type: AccountTypes;
  createdAt: string;
  updatedAt: string;
  lastLogin: string;
  address: string;
  city: string;
  state: string;
  zip: string;
  country: string;
  profileUrl?: string;
  bio?: string;
  phone?: string;
  location?: string;
}

export interface AuthContextValue {
  user: User | null;
}

export const AuthContext = createContext<AuthContextValue>({
  user: null
});

export const useAuth = () => useContext(AuthContext);