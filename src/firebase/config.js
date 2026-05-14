import { initializeApp } from 'firebase/app';
import { getFirestore } from 'firebase/firestore';
import { getAuth, GoogleAuthProvider } from 'firebase/auth';

const firebaseConfig = {
  apiKey: "AIzaSyAVr_YqNRo6hyZ3SnyGC3hcXHFfNev6_c4",
  authDomain: "balance-fc.firebaseapp.com",
  projectId: "balance-fc",
  storageBucket: "balance-fc.appspot.com",
  messagingSenderId: "406241711798",
  appId: "1:406241711798:web:placeholderid",
};

const app = initializeApp(firebaseConfig);
export const db = getFirestore(app);
export const auth = getAuth(app);
export const googleProvider = new GoogleAuthProvider();
