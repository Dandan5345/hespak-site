import { initializeApp } from 'firebase/app';
import { getAuth } from 'firebase/auth';
import { getFirestore } from 'firebase/firestore';

// Same Firebase project ("hespek") as the StudyFlow mobile app, so data
// (courses/tasks/schedule/tokenQuota) is shared across devices for the same
// signed-in user. Registered via `firebase apps:create web`.
const firebaseConfig = {
  apiKey: 'AIzaSyAKFa27h3g_vx9-I-wcrAjkhf1MwhyJ7_c',
  authDomain: 'hespek.firebaseapp.com',
  projectId: 'hespek',
  storageBucket: 'hespek.firebasestorage.app',
  messagingSenderId: '187827714090',
  appId: '1:187827714090:web:b480e2a5fda7d229086b53',
  measurementId: 'G-WT01Z5QK5T',
};

export const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);
export const db = getFirestore(app);
