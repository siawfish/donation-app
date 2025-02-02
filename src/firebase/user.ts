import {Tokens} from 'next-firebase-auth-edge';
import {filterStandardClaims} from 'next-firebase-auth-edge/lib/auth/claims';
import { User } from './auth/AuthContext';
import { db } from './init';
import { DocumentSnapshot } from 'firebase-admin/firestore';
import { UserType } from '@/app/types';

export const toUser = async ({token, customToken, decodedToken}: Tokens): Promise<User> => {
  const {
    uid,
    email,
    picture: photoURL,
    email_verified: emailVerified,
    phone_number: phoneNumber,
    name: displayName,
    source_sign_in_provider: signInProvider
  } = decodedToken;

  const customClaims = filterStandardClaims(decodedToken);
  const user = await db.collection('users').doc(uid).get() as DocumentSnapshot<UserType>;
  const userData = user.data();

  return {
    uid,
    email: email || null,
    displayName: displayName || userData?.name || null,
    photoURL: photoURL || userData?.profileUrl || null,
    phoneNumber: phoneNumber || userData?.phone || null,
    emailVerified: emailVerified || false,
    providerId: signInProvider,
    customClaims,
    idToken: token,
    customToken,
    createdAt: userData?.createdAt || '',
    updatedAt: userData?.updatedAt || '',
    lastLogin: userData?.lastLogin || '',
    address: userData?.address || '',
    city: userData?.city || '',
    state: userData?.state || '',
    zip: userData?.zip || '',
    country: userData?.country || ''
  };
};