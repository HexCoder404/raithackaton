// API Service Layer for VaidyaChain
// Centralized API endpoints and service functions

import {
  db,
  auth,
  collections,
  userRoles,
  transactionTypes,
  contractTypes,
  collection,
  addDoc,
  getDocs,
  doc,
  getDoc,
  updateDoc,
  deleteDoc,
  query,
  where,
  orderBy,
  serverTimestamp
} from './firebase';

import {
  registerUser,
  loginUser,
  logoutUser,
  getUserProfile,
  updateUserProfile,
  checkAuth,
  getCurrentUser,
  getUserRole,
  validateUserRole,
  hasPermission
} from './auth';

import {
  validateUserAccess,
  validateTransaction,
  validateBatchData,
  validateSmartContract,
  checkRateLimit
} from './security';

// API Service Class
class ApiService {
  constructor() {
    this.rateLimitConfig = {
      login: { limit: 5, windowMs: 300000 }, // 5 attempts per 5 minutes
      register: { limit: 3, windowMs: 600000 }, // 3 attempts per 10 minutes
      transaction: { limit: 100, windowMs: 60000 } // 100 transactions per minute
    };
  }

  // Authentication Services
  async register(userData) {
    try {
      // Check rate limiting
      if (!checkRateLimit('global', 'register', this.rateLimitConfig.register.limit, this.rateLimitConfig.register.windowMs)) {
        throw new Error('Too many registration attempts. Please try again later.');
      }

      const result = await registerUser(
        userData.email,
        userData.password,
        userData.role,
        userData.profile
      );

      return {
        success: true,
        data: result.user,
        message: 'Registration successful'
      };
    } catch (error) {
      return {
        success: false,
        error: error.message
      };
    }
  }

  async login(credentials) {
    try {
      // Check rate limiting
      if (!checkRateLimit('global', 'login', this.rateLimitConfig.login.limit, this.rateLimitConfig.login.windowMs)) {
        throw new Error('Too many login attempts. Please try again later.');
      }

      const result = await loginUser(credentials.email, credentials.password);

      return {
        success: true,
        data: result.user,
        message: 'Login successful'
      };
    } catch (error) {
      return {
        success: false,
        error: error.message
      };
    }
  }

  async logout() {
    try {
      await logoutUser();
      return {
        success: true,
        message: 'Logout successful'
      };
    } catch (error) {
      return {
        success: false,
        error: error.message
      };
    }
  }

  async getCurrentUserProfile(userId) {
    try {
      const profile = await getUserProfile(userId);
      return {
        success: true,
        data: profile
      };
    } catch (error) {
      return {
        success: false,
        error: error.message
      };
    }
  }

  async updateProfile(userId, updates) {
    try {
      await updateUserProfile(userId, updates);
      return {
        success: true,
        message: 'Profile updated successfully'
      };
    } catch (error) {
      return {
        success: false,
        error: error.message
      };
    }
  }

  // Transaction Services
  async createTransaction(userId, transactionData) {
    try {
      // Validate user access
      await validateUserAccess(userId);

      // Validate transaction data
      const validation = validateTransaction(transactionData);
      if (!validation.isValid) {
        throw new Error(`Invalid transaction data: ${validation.errors.join(', ')}`);
      }

      // Check rate limiting
      if (!checkRateLimit(userId, 'transaction', this.rateLimitConfig.transaction.limit, this.rateLimitConfig.transaction.windowMs)) {
        throw new Error('Too many transactions. Please try again later.');
      }

      // Create transaction
      const transaction = {
        ...transactionData,
        userId: userId,
        timestamp: serverTimestamp(),
        blockchainHash: this.generateTransactionHash(transactionData)
      };

      const docRef = await addDoc(collection(db, collections.transactions), transaction);

      return {
        success: true,
        data: {
          id: docRef.id,
          ...transaction
        },
        message: 'Transaction created successfully'
      };
    } catch (error) {
      return {
        success: false,
        error: error.message
      };
    }
  }

  async getTransactions(userId, filters = {}) {
    try {
      await validateUserAccess(userId);

      let q = query(collection(db, collections.transactions));

      // Apply filters
      if (filters.type) {
        q = query(q, where('type', '==', filters.type));
      }

      if (filters.batchId) {
        q = query(q, where('batchId', '==', filters.batchId));
      }

      q = query(q, orderBy('timestamp', 'desc'));

      const querySnapshot = await getDocs(q);
      const transactions = [];

      querySnapshot.forEach((doc) => {
        transactions.push({
          id: doc.id,
          ...doc.data()
        });
      });

      return {
        success: true,
        data: transactions
      };
    } catch (error) {
      return {
        success: false,
        error: error.message
      };
    }
  }

  // Batch Services
  async createBatch(userId, batchData) {
    try {
      // Validate user access (only farmers and manufacturers can create batches)
      const userProfile = await validateUserAccess(userId, [userRoles.FARMER, userRoles.MANUFACTURER]);

      // Validate batch data
      const validation = validateBatchData(batchData);
      if (!validation.isValid) {
        throw new Error(`Invalid batch data: ${validation.errors.join(', ')}`);
      }

      const batch = {
        ...batchData,
        ownerId: userId,
        ownerRole: userProfile.role,
        createdAt: serverTimestamp(),
        status: 'created'
      };

      const docRef = await addDoc(collection(db, collections.batches), batch);

      return {
        success: true,
        data: {
          id: docRef.id,
          ...batch
        },
        message: 'Batch created successfully'
      };
    } catch (error) {
      return {
        success: false,
        error: error.message
      };
    }
  }

  async getBatch(userId, batchId) {
    try {
      await validateUserAccess(userId);

      const batchRef = doc(db, collections.batches, batchId);
      const batchSnap = await getDoc(batchRef);

      if (!batchSnap.exists()) {
        throw new Error('Batch not found');
      }

      return {
        success: true,
        data: {
          id: batchSnap.id,
          ...batchSnap.data()
        }
      };
    } catch (error) {
      return {
        success: false,
        error: error.message
      };
    }
  }

  async updateBatch(userId, batchId, updates) {
    try {
      // Validate user access
      await validateUserAccess(userId);

      const batchRef = doc(db, collections.batches, batchId);
      const batchSnap = await getDoc(batchRef);

      if (!batchSnap.exists()) {
        throw new Error('Batch not found');
      }

      // Check ownership
      if (batchSnap.data().ownerId !== userId) {
        throw new Error('Unauthorized: You can only update your own batches');
      }

      await updateDoc(batchRef, {
        ...updates,
        updatedAt: serverTimestamp()
      });

      return {
        success: true,
        message: 'Batch updated successfully'
      };
    } catch (error) {
      return {
        success: false,
        error: error.message
      };
    }
  }

  // Smart Contract Services
  async getSmartContract(contractId) {
    try {
      const contractRef = doc(db, collections.smart_contracts, contractId);
      const contractSnap = await getDoc(contractRef);

      if (!contractSnap.exists()) {
        throw new Error('Smart contract not found');
      }

      return {
        success: true,
        data: {
          id: contractSnap.id,
          ...contractSnap.data()
        }
      };
    } catch (error) {
      return {
        success: false,
        error: error.message
      };
    }
  }

  // Utility Functions
  generateTransactionHash(data) {
    // Simple hash generation for demonstration
    // In production, use a proper cryptographic hash function
    const str = JSON.stringify(data) + Date.now();
    let hash = 0;
    for (let i = 0; i < str.length; i++) {
      const char = str.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash = hash & hash; // Convert to 32-bit integer
    }
    return '0x' + Math.abs(hash).toString(16);
  }

  // Analytics Services
  async getAnalytics(userId, type, timeRange = {}) {
    try {
      await validateUserAccess(userId);

      let q = query(collection(db, collections.analytics), where('type', '==', type));

      if (timeRange.start && timeRange.end) {
        q = query(q, where('timestamp', '>=', timeRange.start), where('timestamp', '<=', timeRange.end));
      }

      const querySnapshot = await getDocs(q);
      const analytics = [];

      querySnapshot.forEach((doc) => {
        analytics.push({
          id: doc.id,
          ...doc.data()
        });
      });

      return {
        success: true,
        data: analytics
      };
    } catch (error) {
      return {
        success: false,
        error: error.message
      };
    }
  }
}

// Export singleton instance
export const apiService = new ApiService();

// Export individual service functions for direct use
export {
  registerUser,
  loginUser,
  logoutUser,
  getUserProfile,
  updateUserProfile,
  checkAuth,
  getCurrentUser,
  getUserRole,
  validateUserRole,
  hasPermission
};