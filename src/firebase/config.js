import { initializeApp, getApps, getApp } from "firebase/app";
import { getAuth } from "firebase/auth";
import { getFirestore } from "firebase/firestore";

const firebaseConfig = {
  apiKey: "AIzaSyCaYL0YwuA_z7VKa083KA0cmC_Eu48H8JA",
  authDomain: "diego-68129.firebaseapp.com",
  projectId: "diego-68129",
  storageBucket: "diego-68129.firebasestorage.app",
  messagingSenderId: "37401215768",
  appId: "1:37401215768:web:9c975d89c15fe58ac2146d"
};

const app = getApps().length > 0 ? getApp() : initializeApp(firebaseConfig);

export const auth = getAuth(app);
export const db = getFirestore(app);
export default app;