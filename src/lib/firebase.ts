/**
 * Legacy Compatibility Facade for Firebase Services.
 * Re-exports from client infrastructure and auth feature hook.
 */

export {
  app,
  auth,
  db,
  storage,
  firebaseConfig,
  handleFirestoreError
} from '../client/infrastructure/firebase/firebaseApp.js';

export {
  uploadAssetToStorage
} from '../client/infrastructure/firebase/storage.js';

export {
  useAuth
} from '../client/features/auth/hooks/useAuth.js';
