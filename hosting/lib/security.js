// Firebase Security Rules Helper Functions
// This file contains validation and security logic for the VaidyaChain application

// Import required Firebase modules
import { 
  auth, 
  db, 
  collections, 
  userRoles,
  doc,
  getDoc
} from './firebase';

// Data validation functions
export const validateEmail = (email) => {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
};

export const validatePassword = (password) => {
  // Password must be at least 6 characters
  return password && password.length >= 6;
};

export const validateRole = (role) => {
  return Object.values(userRoles).includes(role);
};

export const validateProfileData = (profileData) => {
  const errors = [];

  if (!profileData.name || profileData.name.trim().length === 0) {
    errors.push('Name is required');
  }

  if (profileData.contact && !/^\d{10}$/.test(profileData.contact)) {
    errors.push('Contact number must be 10 digits');
  }

  if (profileData.email && !validateEmail(profileData.email)) {
    errors.push('Invalid email format');
  }

  return {
    isValid: errors.length === 0,
    errors
  };
};

// Security middleware for database operations
export const validateUserAccess = async (userId, requiredRole = null) => {
  try {
    // Check if user is authenticated
    if (!userId) {
      throw new Error('User not authenticated');
    }

    // Get user profile to verify role
    const userRef = doc(db, collections.users, userId);
    const userSnap = await getDoc(userRef);

    if (!userSnap.exists()) {
      throw new Error('User profile not found');
    }

    const userProfile = userSnap.data();

    // Check if user is active
    if (!userProfile.isActive) {
      throw new Error('User account is inactive');
    }

    // Check role requirements if specified
    if (requiredRole && userProfile.role !== requiredRole) {
      throw new Error('Insufficient permissions for this action');
    }

    return userProfile;
  } catch (error) {
    console.error('Access validation error:', error);
    throw error;
  }
};

// Input sanitization
export const sanitizeInput = (input) => {
  if (typeof input !== 'string') {
    return input;
  }
  
  // Remove potentially dangerous characters
  return input.replace(/[<>\"'&]/g, '');
};

export const sanitizeObject = (obj) => {
  if (typeof obj !== 'object' || obj === null) {
    return obj;
  }

  const sanitized = {};
  for (const [key, value] of Object.entries(obj)) {
    if (typeof value === 'string') {
      sanitized[key] = sanitizeInput(value);
    } else if (typeof value === 'object' && value !== null) {
      sanitized[key] = sanitizeObject(value);
    } else {
      sanitized[key] = value;
    }
  }
  return sanitized;
};

// Rate limiting helper (basic implementation)
const requestCounts = new Map();

export const checkRateLimit = (userId, action, limit = 100, windowMs = 60000) => {
  const now = Date.now();
  const key = `${userId}:${action}`;
  
  if (!requestCounts.has(key)) {
    requestCounts.set(key, {
      count: 1,
      resetTime: now + windowMs
    });
    return true;
  }

  const requestData = requestCounts.get(key);
  
  if (now > requestData.resetTime) {
    requestData.count = 1;
    requestData.resetTime = now + windowMs;
    return true;
  }

  if (requestData.count >= limit) {
    return false;
  }

  requestData.count++;
  return true;
};

// Transaction validation
export const validateTransaction = (transactionData) => {
  const errors = [];

  // Validate required fields
  if (!transactionData.type) {
    errors.push('Transaction type is required');
  }

  if (!transactionData.data) {
    errors.push('Transaction data is required');
  }

  if (!transactionData.batchId) {
    errors.push('Batch ID is required');
  }

  // Validate transaction type
  const validTypes = ['collection', 'lab-test', 'manufacturing', 'order', 'insurance'];
  if (!validTypes.includes(transactionData.type)) {
    errors.push('Invalid transaction type');
  }

  return {
    isValid: errors.length === 0,
    errors
  };
};

// Batch validation
export const validateBatchData = (batchData) => {
  const errors = [];

  if (!batchData.batchId) {
    errors.push('Batch ID is required');
  }

  if (!batchData.farmerId) {
    errors.push('Farmer ID is required');
  }

  if (!batchData.herbType) {
    errors.push('Herb type is required');
  }

  if (!batchData.quantity || batchData.quantity <= 0) {
    errors.push('Valid quantity is required');
  }

  return {
    isValid: errors.length === 0,
    errors
  };
};

// Smart contract validation
export const validateSmartContract = (contractData) => {
  const errors = [];

  if (!contractData.type) {
    errors.push('Contract type is required');
  }

  if (!contractData.state) {
    errors.push('Contract state is required');
  }

  const validTypes = ['payment', 'insurance', 'quality', 'supply-chain'];
  if (!validTypes.includes(contractData.type)) {
    errors.push('Invalid contract type');
  }

  return {
    isValid: errors.length === 0,
    errors
  };
};

// Export security validation functions
export {
  validateEmail,
  validatePassword,
  validateRole,
  validateProfileData,
  validateUserAccess,
  sanitizeInput,
  sanitizeObject,
  checkRateLimit,
  validateTransaction,
  validateBatchData,
  validateSmartContract
};