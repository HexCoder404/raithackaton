# VaidyaChain API Documentation

## Overview
This document provides comprehensive documentation for the VaidyaChain backend API endpoints and services.

## Authentication

All API endpoints require authentication except for user registration and login.

### Authentication Headers
```
Authorization: Bearer <firebase-id-token>
```

## Base URL
```
https://your-project-id.web.app/api
```

## User Management

### Register User
Create a new user account with role-based access.

**Endpoint:** `POST /api/auth/register`

**Request Body:**
```json
{
  "email": "user@example.com",
  "password": "password123",
  "role": "farmer|lab|manufacturer|consumer",
  "profile": {
    "name": "John Doe",
    "contact": "1234567890",
    "location": "Mumbai, India",
    "certifications": ["Organic Certified", "GMP Certified"]
  }
}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "uid": "user-uid",
    "email": "user@example.com",
    "displayName": "John Doe",
    "role": "farmer"
  },
  "message": "Registration successful"
}
```

**Validation Rules:**
- Email must be valid format
- Password must be at least 6 characters
- Role must be one of: farmer, lab, manufacturer, consumer
- Name is required
- Contact must be 10 digits (optional)
- Location is required

### Login User
Authenticate user and receive session token.

**Endpoint:** `POST /api/auth/login`

**Request Body:**
```json
{
  "email": "user@example.com",
  "password": "password123"
}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "uid": "user-uid",
    "email": "user@example.com",
    "displayName": "John Doe",
    "role": "farmer",
    "profile": {
      "name": "John Doe",
      "contact": "1234567890",
      "location": "Mumbai, India",
      "certifications": ["Organic Certified", "GMP Certified"],
      "createdAt": "2024-01-01T00:00:00.000Z",
      "updatedAt": "2024-01-01T00:00:00.000Z"
    }
  },
  "message": "Login successful"
}
```

### Logout User
End user session.

**Endpoint:** `POST /api/auth/logout`

**Response:**
```json
{
  "success": true,
  "message": "Logout successful"
}
```

### Get User Profile
Retrieve current user profile information.

**Endpoint:** `GET /api/auth/profile`

**Response:**
```json
{
  "success": true,
  "data": {
    "userId": "user-uid",
    "email": "user@example.com",
    "role": "farmer",
    "profile": {
      "name": "John Doe",
      "contact": "1234567890",
      "location": "Mumbai, India",
      "certifications": ["Organic Certified", "GMP Certified"],
      "createdAt": "2024-01-01T00:00:00.000Z",
      "updatedAt": "2024-01-01T00:00:00.000Z"
    },
    "preferences": {
      "language": "en",
      "notifications": true,
      "theme": "light"
    },
    "isActive": true,
    "lastLogin": "2024-01-01T00:00:00.000Z"
  }
}
```

### Update User Profile
Update user profile information.

**Endpoint:** `PUT /api/auth/profile`

**Request Body:**
```json
{
  "profile": {
    "name": "John Smith",
    "contact": "0987654321",
    "location": "Pune, India"
  },
  "preferences": {
    "language": "hi",
    "notifications": false,
    "theme": "dark"
  }
}
```

**Response:**
```json
{
  "success": true,
  "message": "Profile updated successfully"
}
```

## Transactions

### Create Transaction
Create a new blockchain transaction.

**Endpoint:** `POST /api/transactions`

**Authorization:** Required (All roles)

**Request Body:**
```json
{
  "type": "collection|lab-test|manufacturing|order|insurance",
  "data": {
    "herbType": "Ashwagandha",
    "quantity": 100,
    "quality": "A",
    "testResults": {
      "purity": "95%",
      "contaminants": "None"
    }
  },
  "batchId": "batch-123"
}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "id": "transaction-id",
    "type": "collection",
    "data": {
      "herbType": "Ashwagandha",
      "quantity": 100,
      "quality": "A"
    },
    "batchId": "batch-123",
    "userId": "user-uid",
    "timestamp": "2024-01-01T00:00:00.000Z",
    "blockchainHash": "0xabc123..."
  },
  "message": "Transaction created successfully"
}
```

### Get Transactions
Retrieve user's transactions with optional filtering.

**Endpoint:** `GET /api/transactions?role=farmer&type=collection&batchId=batch-123`

**Authorization:** Required (All roles)

**Query Parameters:**
- `type`: Filter by transaction type
- `batchId`: Filter by batch ID
- `limit`: Number of records to return (default: 50)

**Response:**
```json
{
  "success": true,
  "data": [
    {
      "id": "transaction-id",
      "type": "collection",
      "data": {
        "herbType": "Ashwagandha",
        "quantity": 100
      },
      "batchId": "batch-123",
      "userId": "user-uid",
      "timestamp": "2024-01-01T00:00:00.000Z",
      "blockchainHash": "0xabc123..."
    }
  ]
}
```

## Batches

### Create Batch
Create a new batch (Farmers and Manufacturers only).

**Endpoint:** `POST /api/batches`

**Authorization:** Required (Farmer, Manufacturer)

**Request Body:**
```json
{
  "batchId": "BATCH-2024-001",
  "herbType": "Ashwagandha",
  "quantity": 100,
  "location": "Mumbai Farm",
  "harvestDate": "2024-01-01"
}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "id": "batch-id",
    "batchId": "BATCH-2024-001",
    "herbType": "Ashwagandha",
    "quantity": 100,
    "location": "Mumbai Farm",
    "harvestDate": "2024-01-01",
    "ownerId": "user-uid",
    "ownerRole": "farmer",
    "createdAt": "2024-01-01T00:00:00.000Z",
    "status": "created"
  },
  "message": "Batch created successfully"
}
```

### Get Batch
Retrieve batch information by ID.

**Endpoint:** `GET /api/batches/{batchId}`

**Authorization:** Required (All roles)

**Response:**
```json
{
  "success": true,
  "data": {
    "id": "batch-id",
    "batchId": "BATCH-2024-001",
    "herbType": "Ashwagandha",
    "quantity": 100,
    "location": "Mumbai Farm",
    "ownerId": "user-uid",
    "ownerRole": "farmer",
    "createdAt": "2024-01-01T00:00:00.000Z",
    "status": "created"
  }
}
```

### Update Batch
Update batch information (Owner only).

**Endpoint:** `PUT /api/batches/{batchId}`

**Authorization:** Required (Batch Owner)

**Request Body:**
```json
{
  "status": "processed",
  "location": "Processing Facility",
  "notes": "Quality checked and approved"
}
```

**Response:**
```json
{
  "success": true,
  "message": "Batch updated successfully"
}
```

## Smart Contracts

### Get Smart Contract
Retrieve smart contract information.

**Endpoint:** `GET /api/contracts/{contractId}`

**Authorization:** Required (All roles)

**Response:**
```json
{
  "success": true,
  "data": {
    "id": "contract-id",
    "type": "payment|insurance|quality|supply-chain",
    "state": {
      "status": "active",
      "conditions": [...],
      "executions": [...]
    },
    "createdAt": "2024-01-01T00:00:00.000Z",
    "lastUpdated": "2024-01-01T00:00:00.000Z"
  }
}
```

## Analytics

### Get Analytics
Retrieve analytics data for specific metrics.

**Endpoint:** `GET /api/analytics?type=user-activity&start=2024-01-01&end=2024-01-31`

**Authorization:** Required (All roles)

**Query Parameters:**
- `type`: Analytics type (user-activity, transaction-volume, quality-metrics)
- `start`: Start date (ISO format)
- `end`: End date (ISO format)

**Response:**
```json
{
  "success": true,
  "data": [
    {
      "metricId": "metric-id",
      "type": "user-activity",
      "data": {
        "totalUsers": 100,
        "activeUsers": 85,
        "newRegistrations": 20
      },
      "timestamp": "2024-01-31T23:59:59.999Z"
    }
  ]
}
```

## Error Responses

All API endpoints return standardized error responses:

```json
{
  "success": false,
  "error": "Error message describing what went wrong"
}
```

### Common Error Codes

- **400 Bad Request**: Invalid request data
- **401 Unauthorized**: Authentication required or invalid token
- **403 Forbidden**: Insufficient permissions for the action
- **404 Not Found**: Resource not found
- **429 Too Many Requests**: Rate limit exceeded
- **500 Internal Server Error**: Server error

## Rate Limiting

The API implements rate limiting to prevent abuse:

- **Login**: 5 attempts per 5 minutes per IP
- **Registration**: 3 attempts per 10 minutes per IP
- **Transactions**: 100 transactions per minute per user

## Security

- All communication must use HTTPS
- Passwords are hashed using Firebase Authentication
- Role-based access control is enforced
- Input validation and sanitization is applied to all endpoints
- Rate limiting prevents brute force attacks

## SDK Usage Example

```javascript
import { apiService } from './lib/api';

// User registration
const registerResult = await apiService.register({
  email: 'user@example.com',
  password: 'password123',
  role: 'farmer',
  profile: {
    name: 'John Doe',
    contact: '1234567890',
    location: 'Mumbai, India'
  }
});

// User login
const loginResult = await apiService.login({
  email: 'user@example.com',
  password: 'password123'
});

// Create transaction
const transactionResult = await apiService.createTransaction(
  loginResult.data.uid,
  {
    type: 'collection',
    data: { herbType: 'Ashwagandha', quantity: 100 },
    batchId: 'batch-123'
  }
);