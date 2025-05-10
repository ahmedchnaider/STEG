// Import the functions you need from the SDKs you need
import { initializeApp } from "firebase/app";
import { getAnalytics } from "firebase/analytics";
import { getAuth } from "firebase/auth";

// Your web app's Firebase configuration
// For Firebase JS SDK v7.20.0 and later, measurementId is optional
const firebaseConfig = {
  apiKey: "AIzaSyDJ4IsqoYNK9-vT5msMxvleK_3j6uJigGU",
  authDomain: "steg-2e991.firebaseapp.com",
  projectId: "steg-2e991",
  storageBucket: "steg-2e991.firebasestorage.app",
  messagingSenderId: "414248697784",
  appId: "1:414248697784:web:f55c9fe4bba4426e08d94d",
  measurementId: "G-6GZNTT8MTE"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
const analytics = getAnalytics(app);
const auth = getAuth(app);

export { app, analytics, auth }; 