// Firebase configuration and initialization
import { initializeApp } from 'firebase/app';
import { getFirestore, collection, addDoc, getDocs, doc, getDoc, updateDoc, deleteDoc, query, where, orderBy, serverTimestamp } from 'firebase/firestore';
import { getAuth, createUserWithEmailAndPassword, signInWithEmailAndPassword, signOut, onAuthStateChanged, updateProfile } from 'firebase/auth';

// Firebase configuration
const firebaseConfig = {
  apiKey: "AIzaSyB8k1Q1Q1Q1Q1Q1Q1Q1Q1Q1Q1Q1Q1Q1Q1Q",
  authDomain: "raithackaton.firebaseapp.com",
  projectId: "raithackaton",
  storageBucket: "raithackaton.appspot.com",
  messagingSenderId: "123456789",
  appId: "1:123456789:web:123456789abcdef"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
const db = getFirestore(app);
const auth = getAuth(app);

// Database schema definitions
const collections = {
  users: 'users',
  transactions: 'transactions',
  smart_contracts: 'smart_contracts',
  notifications: 'notifications',
  analytics: 'analytics',
  batches: 'batches'
};

// User roles
const userRoles = {
  FARMER: 'farmer',
  LAB: 'lab',
  MANUFACTURER: 'manufacturer',
  CONSUMER: 'consumer'
};

// Transaction types
const transactionTypes = {
  COLLECTION: 'collection',
  LAB_TEST: 'lab-test',
  MANUFACTURING: 'manufacturing',
  ORDER: 'order',
  INSURANCE: 'insurance'
};

// Smart contract types
const contractTypes = {
  PAYMENT: 'payment',
  INSURANCE: 'insurance',
  QUALITY: 'quality',
  SUPPLY_CHAIN: 'supply-chain'
};

// Export Firebase services and constants
export {
  app,
  db,
  auth,
  collections,
  userRoles,
  transactionTypes,
  contractTypes,
  // Firestore methods
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
  serverTimestamp,
  // Auth methods
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  signOut,
  onAuthStateChanged,
  updateProfile
};