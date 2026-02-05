import { initializeApp } from "firebase/app";
import { getAuth } from "firebase/auth";
import { getFirestore } from "firebase/firestore";

const firebaseConfig = {
    apiKey: "AIzaSyBzuK7khQK7k-KFbWaBL5cG3iOOHgG0zM8",
    authDomain: "solo-84c8e.firebaseapp.com",
    projectId: "solo-84c8e",
    storageBucket: "solo-84c8e.firebasestorage.app",
    messagingSenderId: "632018773853",
    appId: "1:632018773853:web:ec5437a4b45c41b39c2ab4",
};

const app = initializeApp(firebaseConfig);

export const auth = getAuth(app);
export const db = getFirestore(app);