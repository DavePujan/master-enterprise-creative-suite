/**
 * Raw Firestore Database Instance & Core Method Exports.
 */

export {
  db,
  handleFirestoreError
} from './firebaseApp.js';

export {
  doc,
  getDoc,
  getDocs,
  setDoc,
  updateDoc,
  deleteDoc,
  addDoc,
  collection,
  query,
  orderBy,
  limit,
  onSnapshot,
  getDocFromServer
} from 'firebase/firestore';
