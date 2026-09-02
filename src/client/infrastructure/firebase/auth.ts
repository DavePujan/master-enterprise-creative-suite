/**
 * Raw Firebase Auth Service & Provider Exports.
 */

export {
  auth,
  app
} from './firebaseApp.js';

export {
  GoogleAuthProvider,
  signInWithPopup,
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  updateProfile,
  signOut,
  onAuthStateChanged,
  type User
} from 'firebase/auth';
