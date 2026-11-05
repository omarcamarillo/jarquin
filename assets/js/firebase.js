// Firebase compartido por login y dashboard.
import { initializeApp, getApps, getApp } from "https://www.gstatic.com/firebasejs/13.2.0/firebase-app.js";
import { getAuth } from "https://www.gstatic.com/firebasejs/13.2.0/firebase-auth.js";
import { getFirestore, enableIndexedDbPersistence } from "https://www.gstatic.com/firebasejs/13.2.0/firebase-firestore.js";

const firebaseConfig = {
  apiKey: "AIzaSyC58yVhjPLKBmnSbyTANrR1DPaH8wvgwf0",
  authDomain: "inovice-note.firebaseapp.com",
  projectId: "inovice-note",
  storageBucket: "inovice-note.firebasestorage.app",
  messagingSenderId: "533605852924",
  appId: "1:533605852924:web:9a5ed560bd4a46c816d979",
  measurementId: "G-ZRSH932H15"
};

export const app = getApps().length ? getApp() : initializeApp(firebaseConfig);
export const auth = getAuth(app);
export const db = getFirestore(app);

// Mantiene datos previamente consultados disponibles sin conexión.
// Si otra pestaña ya activó la persistencia, no bloqueamos el inicio.
enableIndexedDbPersistence(db).catch((error) => {
  if (error.code !== "failed-precondition" && error.code !== "unimplemented") {
    console.warn("No se pudo activar la caché local de Firestore:", error);
  }
});
