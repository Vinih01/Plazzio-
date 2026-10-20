import React, { createContext, useContext, useEffect, useState } from 'react';
import { User as FirebaseUser, onAuthStateChanged } from 'firebase/auth';
import { doc, getDoc, setDoc } from 'firebase/firestore';
import { auth, db, loginWithGoogle, logoutUser, testConnection } from '../lib/firebase';
import { UserProfile, UserRole } from '../types';

interface AuthContextType {
  currentUser: FirebaseUser | null;
  userProfile: UserProfile | null;
  role: UserRole;
  loading: boolean;
  isAdmin: boolean;
  isMerchant: boolean;
  isConsumer: boolean;
  signInWithGoogle: () => Promise<void>;
  signOut: () => Promise<void>;
  updateUserRole: (newRole: UserRole) => Promise<void>;
  simulateRole: (role: UserRole) => void;
  simulatedRole: UserRole | null;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

const ADMIN_EMAIL = 'mapwiser@gmail.com';

function isAuthorizedAdminIdentity(user: FirebaseUser | null): boolean {
  return Boolean(
    user?.email &&
    user.email.toLowerCase() === ADMIN_EMAIL &&
    user.emailVerified &&
    user.providerData.some(provider => provider.providerId === 'google.com')
  );
}

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [currentUser, setCurrentUser] = useState<FirebaseUser | null>(null);
  const [userProfile, setUserProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [simulatedRole, setSimulatedRole] = useState<UserRole | null>(null);

  useEffect(() => {
    testConnection();

    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      setCurrentUser(user);
      if (user) {
        const authorizedAdmin = isAuthorizedAdminIdentity(user);
        try {
          const userDocRef = doc(db, 'users', user.uid);
          const snap = await getDoc(userDocRef);

          let role: UserRole = authorizedAdmin ? 'admin' : 'consumer';

          if (snap.exists()) {
            const data = snap.data() as UserProfile;
            // Respect admin bootstrap
            if (authorizedAdmin) {
              data.role = 'admin';
              try {
                await setDoc(doc(db, 'admins', user.uid), {
                  uid: user.uid,
                  email: user.email,
                  grantedAt: new Date().toISOString()
                }, { merge: true });
              } catch (adminErr) {
                console.warn('Admin collection bootstrap notice:', adminErr);
              }
            } else if (data.role === 'admin') {
              // A legacy profile must never grant admin UI access without the verified Google identity.
              data.role = 'consumer';
            }
            setUserProfile(data);
          } else {
            // Create user document
            const newProfile: UserProfile = {
              uid: user.uid,
              name: user.displayName || user.email?.split('@')[0] || 'Usuário',
              email: user.email || '',
              role: role,
              createdAt: new Date().toISOString(),
              updatedAt: new Date().toISOString(),
            };
            await setDoc(userDocRef, newProfile);

            if (role === 'admin') {
              try {
                await setDoc(doc(db, 'admins', user.uid), {
                  uid: user.uid,
                  email: user.email,
                  grantedAt: new Date().toISOString()
                }, { merge: true });
              } catch (adminErr) {
                console.warn('Admin collection bootstrap notice:', adminErr);
              }
            }
            setUserProfile(newProfile);
          }
        } catch (err) {
          console.warn('Profile sync fallback:', err);
          setUserProfile({
            uid: user.uid,
            name: user.displayName || 'Usuário',
            email: user.email || '',
            role: authorizedAdmin ? 'admin' : 'consumer',
          });
        }
      } else {
        setUserProfile(null);
      }
      setLoading(false);
    });

    return () => unsubscribe();
  }, []);

  const handleSignInWithGoogle = async () => {
    try {
      await loginWithGoogle();
    } catch (error) {
      console.error('Login error:', error);
      throw error;
    }
  };

  const handleSignOut = async () => {
    setSimulatedRole(null);
    await logoutUser();
  };

  const updateUserRole = async (newRole: UserRole) => {
    if (!currentUser) return;
    try {
      const userDocRef = doc(db, 'users', currentUser.uid);
      await setDoc(userDocRef, { role: newRole, updatedAt: new Date().toISOString() }, { merge: true });
      if (userProfile) {
        setUserProfile({ ...userProfile, role: newRole });
      }
    } catch (e) {
      console.warn('Update role error:', e);
      if (userProfile) {
        setUserProfile({ ...userProfile, role: newRole });
      }
    }
  };

  const simulateRole = (newRole: UserRole) => {
    const isActualAdmin = isAuthorizedAdminIdentity(currentUser);
    if (!isActualAdmin) {
      console.warn('Unauthorized attempt to simulate role.');
      return;
    }
    setSimulatedRole(newRole);
  };

  const isActualAdmin = isAuthorizedAdminIdentity(currentUser);
  const effectiveRole: UserRole = isActualAdmin ? (simulatedRole || 'admin') : (userProfile?.role || 'consumer');

  return (
    <AuthContext.Provider
      value={{
        currentUser,
        userProfile,
        role: effectiveRole,
        loading,
        isAdmin: isActualAdmin,
        isMerchant: effectiveRole === 'merchant',
        isConsumer: effectiveRole === 'consumer',
        signInWithGoogle: handleSignInWithGoogle,
        signOut: handleSignOut,
        updateUserRole,
        simulateRole,
        simulatedRole,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
