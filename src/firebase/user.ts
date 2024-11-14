import {Tokens} from 'next-firebase-auth-edge';
import {filterStandardClaims} from 'next-firebase-auth-edge/lib/auth/claims';
import { User } from './auth/AuthContext';
import { db } from './init';

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
  const user = await db.collection('users').doc(uid).get();
  const userData = user.data();

  return {
    uid,
    email: email ?? null,
    displayName: displayName ?? userData?.name ?? null,
    photoURL: photoURL ?? null,
    phoneNumber: phoneNumber ?? userData?.phone ?? null,
    emailVerified: emailVerified ?? false,
    providerId: signInProvider,
    customClaims,
    idToken: token,
    customToken,
    userType: userData?.userType ?? null,
    type: userData?.type ?? null,
    createdAt: userData?.createdAt ?? null,
    updatedAt: userData?.updatedAt ?? null,
    lastLogin: userData?.lastLogin ?? null,
    address: userData?.address ?? null,
    city: userData?.city ?? null,
    state: userData?.state ?? null,
    zip: userData?.zip ?? null,
    country: userData?.country ?? null
  };
};