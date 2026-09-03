const SERVICE_ACCOUNT_ENV = {
  projectId: 'NEXT_PUBLIC_FIREBASE_PROJECT_ID',
  clientEmail: 'FIREBASE_ADMIN_CLIENT_EMAIL',
  privateKey: 'FIREBASE_ADMIN_PRIVATE_KEY',
} as const;

function getServiceAccount() {
  const missing = Object.values(SERVICE_ACCOUNT_ENV).filter((name) => !process.env[name]);
  if (missing.length > 0) {
    throw new Error(
      `Firebase Admin service account is not configured. Missing env vars: ${missing.join(', ')}. ` +
        'Next only loads .env.production for `next build`/`next start`; for `next dev` put these in .env.local.'
    );
  }

  return {
    projectId: process.env[SERVICE_ACCOUNT_ENV.projectId]!,
    clientEmail: process.env[SERVICE_ACCOUNT_ENV.clientEmail]!,
    privateKey: process.env[SERVICE_ACCOUNT_ENV.privateKey]!.replace(/\\n/g, '\n'),
  };
}

export const serverConfig = {
  cookieName: process.env.AUTH_COOKIE_NAME!,
  firebaseApiKey: process.env.FIREBASE_API_KEY!,
  cookieSignatureKeys: [process.env.AUTH_COOKIE_SIGNATURE_KEY_CURRENT!, process.env.AUTH_COOKIE_SIGNATURE_KEY_PREVIOUS!],
  cookieSerializeOptions: {
    path: "/",
    httpOnly: true,
    secure: process.env.USE_SECURE_COOKIES === "true",
    sameSite: "lax" as const,
    maxAge: 12 * 60 * 60 * 24,
  },
  serviceAccount: getServiceAccount(),
};

export const authConfig = {
  apiKey: serverConfig.firebaseApiKey,
  cookieName: serverConfig.cookieName,
  cookieSignatureKeys: serverConfig.cookieSignatureKeys,
  cookieSerializeOptions: {
    path: '/',
    httpOnly: true,
    secure: serverConfig.cookieSerializeOptions.secure, // Set this to true on HTTPS environments
    sameSite: 'lax' as const,
    maxAge: 12 * 60 * 60 * 24 // twelve days
  },
  serviceAccount: serverConfig.serviceAccount,
  debug: true,
  // Set to false in Firebase Hosting environment due to https://stackoverflow.com/questions/44929653/firebase-cloud-function-wont-store-cookie-named-other-than-session
  enableMultipleCookies: true,
  // Set to false if you're not planning to use `signInWithCustomToken` Firebase Client SDK method
  enableCustomToken: true,
  experimental_enableTokenRefreshOnExpiredKidHeader: true,
};
