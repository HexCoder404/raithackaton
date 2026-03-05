import { 
  auth, 
  db, 
  collections, 
  userRoles,
  createUserWithEmailAndPassword, 
  signInWithEmailAndPassword, 
  signOut, 
  onAuthStateChanged, 
  updateProfile,
  collection,
  addDoc,
  doc,
  getDoc,
  updateDoc,
  serverTimestamp
} from './firebase';

// User registration with role-based access
export const registerUser = async (email, password, role, profileData) => {
  try {
    // Validate role
    if (!Object.values(userRoles).includes(role)) {
      throw new Error('Invalid user role');
    }

    // Create Firebase authentication user
    const userCredential = await createUserWithEmailAndPassword(auth, email, password);
    const user = userCredential.user;

    // Create user profile in Firestore
    const userProfile = {
      userId: user.uid,
      email: email,
      role: role,
      profile: {
        name: profileData.name || '',
        contact: profileData.contact || '',
        location: profileData.location || '',
        certifications: profileData.certifications || [],
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp()
      },
      preferences: {
        language: profileData.language || 'en',
        notifications: profileData.notifications !== false, // default true
        theme: profileData.theme || 'light'
      },
      isActive: true,
      lastLogin: serverTimestamp()
    };

    // Save user profile to Firestore
    await addDoc(collection(db, collections.users), userProfile);

    // Update Firebase auth profile
    await updateProfile(user, {
      displayName: profileData.name,
      photoURL: profileData.photoURL || null
    });

    return {
      success: true,
      user: {
        uid: user.uid,
        email: user.email,
        displayName: user.displayName,
        role: role
      }
    };

  } catch (error) {
    console.error('Registration error:', error);
    throw new Error(`Registration failed: ${error.message}`);
  }
};

// User login
export const loginUser = async (email, password) => {
  try {
    const userCredential = await signInWithEmailAndPassword(auth, email, password);
    const user = userCredential.user;

    // Update last login timestamp
    const userRef = doc(db, collections.users, user.uid);
    await updateDoc(userRef, {
      lastLogin: serverTimestamp()
    });

    // Get user profile
    const userProfile = await getUserProfile(user.uid);

    return {
      success: true,
      user: {
        uid: user.uid,
        email: user.email,
        displayName: user.displayName,
        role: userProfile.role,
        profile: userProfile.profile
      }
    };

  } catch (error) {
    console.error('Login error:', error);
    throw new Error(`Login failed: ${error.message}`);
  }
};

// User logout
export const logoutUser = async () => {
  try {
    await signOut(auth);
    return { success: true };
  } catch (error) {
    console.error('Logout error:', error);
    throw new Error(`Logout failed: ${error.message}`);
  }
};

// Get user profile
export const getUserProfile = async (userId) => {
  try {
    const userRef = doc(db, collections.users, userId);
    const userSnap = await getDoc(userRef);

    if (userSnap.exists()) {
      return userSnap.data();
    } else {
      throw new Error('User profile not found');
    }
  } catch (error) {
    console.error('Get user profile error:', error);
    throw new Error(`Failed to get user profile: ${error.message}`);
  }
};

// Update user profile
export const updateUserProfile = async (userId, updates) => {
  try {
    const userRef = doc(db, collections.users, userId);
    
    // Prepare update data
    const updateData = {
      ...updates,
      updatedAt: serverTimestamp()
    };

    await updateDoc(userRef, updateData);

    // Update Firebase auth profile if displayName is being updated
    if (updates.profile && updates.profile.name) {
      const user = auth.currentUser;
      if (user) {
        await updateProfile(user, {
          displayName: updates.profile.name
        });
      }
    }

    return { success: true };
  } catch (error) {
    console.error('Update user profile error:', error);
    throw new Error(`Failed to update user profile: ${error.message}`);
  }
};

// Check if user is authenticated
export const checkAuth = () => {
  return new Promise((resolve) => {
    const unsubscribe = onAuthStateChanged(auth, (user) => {
      unsubscribe();
      resolve(user);
    });
  });
};

// Get current authenticated user
export const getCurrentUser = () => {
  return auth.currentUser;
};

// Get user role
export const getUserRole = async (userId) => {
  try {
    const userProfile = await getUserProfile(userId);
    return userProfile.role;
  } catch (error) {
    console.error('Get user role error:', error);
    return null;
  }
};

// Validate user role for specific actions
export const validateUserRole = (userRole, allowedRoles) => {
  if (!userRole || !allowedRoles.includes(userRole)) {
    throw new Error('Unauthorized: Insufficient permissions');
  }
  return true;
};

// Role-based access control helper
export const hasPermission = (userRole, requiredRole) => {
  // Define role hierarchy (higher roles can access lower role functions)
  const roleHierarchy = {
    [userRoles.CONSUMER]: 1,
    [userRoles.FARMER]: 2,
    [userRoles.LAB]: 3,
    [userRoles.MANUFACTURER]: 4
  };

  return roleHierarchy[userRole] >= roleHierarchy[requiredRole];
};

// Export user roles for use in components
export { userRoles };