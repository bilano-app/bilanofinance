import { initializeApp } from "firebase/app";
import { getAuth, GoogleAuthProvider } from "firebase/auth";

// SAYA SALIN PERSIS DARI GAMBAR FIREBASE ANDA
const firebaseConfig = {
  apiKey: "AIzaSyBT4SSQ53yYxfbSw_0hpLXF9KTvrWiA1ig", 
  authDomain: "bilano-apk.firebaseapp.com",
  projectId: "bilano-apk",
  storageBucket: "bilano-apk.firebasestorage.app",
  messagingSenderId: "774211302395",
  appId: "1:774211302395:web:5c7eedfe281a59536bd15e",
  measurementId: "G-45C9V0N4HK"
};

const app = initializeApp(firebaseConfig);

// EXPORT WAJIB
export const auth = getAuth(app);
export const googleProvider = new GoogleAuthProvider();