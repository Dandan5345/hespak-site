import {
  createContext,
  useContext,
  useEffect,
  useState,
  type ReactNode,
} from 'react';
import {
  GoogleAuthProvider,
  OAuthProvider,
  onAuthStateChanged,
  signInAnonymously,
  signInWithCredential,
  signInWithPopup,
  linkWithCredential,
  signOut as fbSignOut,
  deleteUser,
  type AuthCredential,
  type User,
} from 'firebase/auth';
import { auth } from '../firebase/config';

interface AuthCtx {
  user: User | null;
  loading: boolean;
  authBusy: boolean;
  /** A *real* (non-anonymous) account is signed in. */
  isSignedIn: boolean;
  uid: string | null;
  displayName: string | null;
  email: string | null;
  photoUrl: string | null;
  signInWithGoogle: () => Promise<User | null>;
  signInWithApple: () => Promise<User | null>;
  signOut: () => Promise<void>;
  deleteAccount: () => Promise<void>;
  idToken: () => Promise<string | null>;
}

const Ctx = createContext<AuthCtx | null>(null);

/** Link a credential onto the current anonymous user so cloud data carries
 * over; falls back to a plain sign-in if that credential already belongs to
 * another account (mirrors AuthService._signInOrLink in the Flutter app). */
async function signInOrLink(credential: AuthCredential): Promise<User | null> {
  const current = auth.currentUser;
  if (current && current.isAnonymous) {
    try {
      const cred = await linkWithCredential(current, credential);
      return cred.user;
    } catch (e: unknown) {
      const code = (e as { code?: string })?.code ?? '';
      const recoverable = [
        'auth/credential-already-in-use',
        'auth/email-already-in-use',
        'auth/provider-already-linked',
      ];
      if (!recoverable.includes(code)) throw e;
      // fall through: this credential belongs to its own account already
    }
  }
  const cred = await signInWithCredential(auth, credential);
  return cred.user;
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [authBusy, setAuthBusy] = useState(false);

  useEffect(() => {
    const unsub = onAuthStateChanged(auth, (u) => {
      setUser(u);
      setLoading(false);
      if (!u) {
        signInAnonymously(auth).catch(() => {
          /* offline — app still works locally */
        });
      }
    });
    return unsub;
  }, []);

  const signInWithGoogle = async () => {
    setAuthBusy(true);
    try {
      const provider = new GoogleAuthProvider();
      provider.setCustomParameters({ prompt: 'select_account' });
      try {
        const result = await signInWithPopup(auth, provider);
        return result.user;
      } catch (e: unknown) {
        const code = (e as { code?: string })?.code ?? '';
        if (code === 'auth/credential-already-in-use' || code === 'auth/account-exists-with-different-credential') {
          const cred = GoogleAuthProvider.credentialFromError(e as never);
          if (cred) return signInOrLink(cred);
        }
        if (code === 'auth/popup-closed-by-user' || code === 'auth/cancelled-popup-request') {
          return null;
        }
        throw e;
      }
    } finally {
      setAuthBusy(false);
    }
  };

  const signInWithApple = async () => {
    setAuthBusy(true);
    try {
      const provider = new OAuthProvider('apple.com');
      provider.addScope('email');
      provider.addScope('name');
      try {
        const result = await signInWithPopup(auth, provider);
        return result.user;
      } catch (e: unknown) {
        const code = (e as { code?: string })?.code ?? '';
        if (code === 'auth/popup-closed-by-user' || code === 'auth/cancelled-popup-request') {
          return null;
        }
        throw e;
      }
    } finally {
      setAuthBusy(false);
    }
  };

  const signOut = async () => {
    await fbSignOut(auth);
  };

  const deleteAccount = async () => {
    if (!auth.currentUser) return;
    await deleteUser(auth.currentUser);
  };

  const idToken = async () => {
    try {
      return (await auth.currentUser?.getIdToken()) ?? null;
    } catch {
      return null;
    }
  };

  const isSignedIn = !!user && !user.isAnonymous;

  return (
    <Ctx.Provider
      value={{
        user,
        loading,
        authBusy,
        isSignedIn,
        uid: user?.uid ?? null,
        displayName: user?.displayName ?? null,
        email: user?.email ?? null,
        photoUrl: user?.photoURL ?? null,
        signInWithGoogle,
        signInWithApple,
        signOut,
        deleteAccount,
        idToken,
      }}
    >
      {children}
    </Ctx.Provider>
  );
}

export function useAuth(): AuthCtx {
  const ctx = useContext(Ctx);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
}
