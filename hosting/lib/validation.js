// Data Validation Middleware for VaidyaChain
// Comprehensive validation system for all data inputs

// Import security validation functions
import {
  validateEmail,
  validatePassword,
  validateRole,
  validateProfileData,
  validateTransaction,
  validateBatchData,
  validateSmartContract,
  sanitizeInput,
  sanitizeObject
} from './security';

// Validation middleware factory
export const createValidationMiddleware = (validationRules) => {
  return (req, res, next) => {
    try {
      const { body, params, query } = req;
      
      // Validate body data
      if (validationRules.body) {
        const bodyValidation = validateObject(body, validationRules.body);
        if (!bodyValidation.isValid) {
          return res.status(400).json({
            success: false,
            message: 'Invalid request body',
            errors: bodyValidation.errors
          });
        }
      }
      
      // Validate params
      if (validationRules.params) {
        const paramsValidation = validateObject(params, validationRules.params);
        if (!paramsValidation.isValid) {
          return res.status(400).json({
            success: false,
            message: 'Invalid request parameters',
            errors: paramsValidation.errors
          });
        }
      }
      
      // Validate query
      if (validationRules.query) {
        const queryValidation = validateObject(query, validationRules.query);
        if (!queryValidation.isValid) {
          return res.status(400).json({
            success: false,
            message: 'Invalid query parameters',
            errors: queryValidation.errors
          });
        }
      }
      
      // Sanitize inputs
      req.body = sanitizeObject(req.body);
      req.params = sanitizeObject(req.params);
      req.query = sanitizeObject(req.query);
      
      next();
    } catch (error) {
      console.error('Validation middleware error:', error);
      res.status(500).json({
        success: false,
        message: 'Validation error'
      });
    }
  };
};

// Object validation function
export const validateObject = (data, rules) => {
  const errors = [];
  
  for (const [field, rule] of Object.entries(rules)) {
    const value = data[field];
    
    // Check if field is required
    if (rule.required && (value === undefined || value === null || value === '')) {
      errors.push(`${field} is required`);
      continue;
    }
    
    // Skip validation if field is not provided and not required
    if (value === undefined || value === null) {
      continue;
    }
    
    // Validate type
    if (rule.type) {
      const typeValidation = validateType(value, rule.type);
      if (!typeValidation.isValid) {
        errors.push(...typeValidation.errors.map(err => `${field}: ${err}`));
      }
    }
    
    // Validate custom rules
    if (rule.custom) {
      const customValidation = rule.custom(value);
      if (!customValidation.isValid) {
        errors.push(...customValidation.errors.map(err => `${field}: ${err}`));
      }
    }
    
    // Validate nested objects
    if (rule.fields && typeof value === 'object') {
      const nestedValidation = validateObject(value, rule.fields);
      if (!nestedValidation.isValid) {
        errors.push(...nestedValidation.errors);
      }
    }
  }
  
  return {
    isValid: errors.length === 0,
    errors
  };
};

// Type validation helper
export const validateType = (value, expectedType) => {
  const errors = [];
  
  switch (expectedType) {
    case 'string':
      if (typeof value !== 'string') {
        errors.push('must be a string');
      } else if (value.trim().length === 0) {
        errors.push('cannot be empty');
      }
      break;
      
    case 'number':
      if (typeof value !== 'number' || isNaN(value)) {
        errors.push('must be a valid number');
      }
      break;
      
    case 'integer':
      if (!Number.isInteger(value)) {
        errors.push('must be an integer');
      }
      break;
      
    case 'boolean':
      if (typeof value !== 'boolean') {
        errors.push('must be a boolean');
      }
      break;
      
    case 'array':
      if (!Array.isArray(value)) {
        errors.push('must be an array');
      }
      break;
      
    case 'object':
      if (typeof value !== 'object' || value === null || Array.isArray(value)) {
        errors.push('must be an object');
      }
      break;
      
    case 'email':
      if (!validateEmail(value)) {
        errors.push('must be a valid email address');
      }
      break;
      
    case 'password':
      if (!validatePassword(value)) {
        errors.push('password must be at least 6 characters long');
      }
      break;
      
    case 'role':
      if (!validateRole(value)) {
        errors.push('must be a valid user role');
      }
      break;
  }
  
  return {
    isValid: errors.length === 0,
    errors
  };
};

// Pre-defined validation rules for common operations

// User registration validation
export const userRegistrationValidation = {
  body: {
    email: {
      required: true,
      type: 'email'
    },
    password: {
      required: true,
      type: 'password'
    },
    role: {
      required: true,
      type: 'role'
    },
    profile: {
      required: true,
      type: 'object',
      fields: {
        name: {
          required: true,
          type: 'string'
        },
        contact: {
          required: false,
          type: 'string',
          custom: (value) => {
            if (value && !/^\d{10}$/.test(value)) {
              return { isValid: false, errors: ['must be 10 digits'] };
            }
            return { isValid: true, errors: [] };
          }
        },
        location: {
          required: true,
          type: 'string'
        },
        certifications: {
          required: false,
          type: 'array'
        }
      }
    }
  }
};

// User login validation
export const userLoginValidation = {
  body: {
    email: {
      required: true,
      type: 'email'
    },
    password: {
      required: true,
      type: 'password'
    }
  }
};

// Transaction validation
export const transactionValidation = {
  body: {
    type: {
      required: true,
      type: 'string',
      custom: (value) => {
        const validTypes = ['collection', 'lab-test', 'manufacturing', 'order', 'insurance'];
        if (!validTypes.includes(value)) {
          return { isValid: false, errors: ['must be a valid transaction type'] };
        }
        return { isValid: true, errors: [] };
      }
    },
    data: {
      required: true,
      type: 'object'
    },
    batchId: {
      required: true,
      type: 'string'
    }
  }
};

// Batch validation
export const batchValidation = {
  body: {
    batchId: {
      required: true,
      type: 'string'
    },
    farmerId: {
      required: true,
      type: 'string'
    },
    herbType: {
      required: true,
      type: 'string'
    },
    quantity: {
      required: true,
      type: 'number',
      custom: (value) => {
        if (value <= 0) {
          return { isValid: false, errors: ['must be greater than 0'] };
        }
        return { isValid: true, errors: [] };
      }
    },
    location: {
      required: false,
      type: 'string'
    }
  }
};

// Smart contract validation
export const smartContractValidation = {
  body: {
    type: {
      required: true,
      type: 'string',
      custom: (value) => {
        const validTypes = ['payment', 'insurance', 'quality', 'supply-chain'];
        if (!validTypes.includes(value)) {
          return { isValid: false, errors: ['must be a valid contract type'] };
        }
        return { isValid: true, errors: [] };
      }
    },
    state: {
      required: true,
      type: 'object'
    }
  }
};

// Profile update validation
export const profileUpdateValidation = {
  body: {
    profile: {
      required: false,
      type: 'object',
      fields: {
        name: {
          required: false,
          type: 'string'
        },
        contact: {
          required: false,
          type: 'string',
          custom: (value) => {
            if (value && !/^\d{10}$/.test(value)) {
              return { isValid: false, errors: ['must be 10 digits'] };
            }
            return { isValid: true, errors: [] };
          }
        },
        location: {
          required: false,
          type: 'string'
        }
      }
    },
    preferences: {
      required: false,
      type: 'object',
      fields: {
        language: {
          required: false,
          type: 'string'
        },
        notifications: {
          required: false,
          type: 'boolean'
        },
        theme: {
          required: false,
          type: 'string'
        }
      }
    }
  }
};

// Export validation middleware factory and rules
export {
  createValidationMiddleware,
  validateObject,
  validateType,
  userRegistrationValidation,
  userLoginValidation,
  transactionValidation,
  batchValidation,
  smartContractValidation,
  profileUpdateValidation
};