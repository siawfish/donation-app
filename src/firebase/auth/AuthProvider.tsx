'use client';

import * as React from 'react';
import { signInWithCustomToken, signOut } from 'firebase/auth';
import { AuthContext, User } from './AuthContext';
import { getFirebaseAuth } from './firebase';

export interface AuthProviderProps {
  user: User | null;
  children: React.ReactNode;
}

export const AuthProvider: React.FunctionComponent<AuthProviderProps> = ({
  user,
  children
}) => {
  /**
   * Sign the browser SDK in to match the server session.
   *
   * Login happens in a server action, which mints a session cookie — so the
   * server knows who you are, but the client SDK never did. Anything that talks
   * to Firebase directly from the browser (Storage uploads for listing photos,
   * chat attachments and avatars) was therefore running unauthenticated and
   * being rejected by Storage rules, even though the UI showed you as logged in.
   *
   * `enableCustomToken` is already on in authConfig and `toUser` already returns
   * the token; this is the missing half. Persistence stays in-memory, so no
   * credentials are written to the browser.
   */
  React.useEffect(() => {
    const auth = getFirebaseAuth();

    if (!user) {
      // Signed out on the server — drop any client session too.
      if (auth.currentUser) signOut(auth).catch(() => {/* nothing useful to do */});
      return;
    }

    if (!user.customToken) {
      // Signed in server-side but no token to hand the client SDK: uploads will
      // be rejected. Almost always means enableCustomToken is off in authConfig.
      console.warn(
        'No customToken on the session — the Firebase client SDK cannot sign in, ' +
        'so Storage uploads will fail. Check `enableCustomToken` in authConfig.'
      );
      return;
    }

    // Already the right user; re-signing in would only churn tokens.
    if (auth.currentUser?.uid === user.uid) return;

    signInWithCustomToken(auth, user.customToken).catch((error) => {
      // Non-fatal: reads still work through the server. Uploads will surface a
      // clear message of their own rather than failing silently here.
      console.error('Firebase client sign-in failed; uploads may be rejected', error);
    });
  }, [user, user?.uid, user?.customToken]);

  return (
    <AuthContext.Provider
      value={{
        user
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};
