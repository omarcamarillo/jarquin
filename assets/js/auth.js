import { auth } from "./firebase.js";
import {
  signInWithEmailAndPassword, createUserWithEmailAndPassword,
  signInWithPopup, GoogleAuthProvider, sendPasswordResetEmail,
  sendEmailVerification, onAuthStateChanged
} from "https://www.gstatic.com/firebasejs/13.2.0/firebase-auth.js";

const googleProvider = new GoogleAuthProvider();
let authMode = "login";
const $ = (id) => document.getElementById(id);

function showAuthAlert(message, isError = true) {
  const box = $("auth-alert");
  if (!box) return;
  box.textContent = message;
  box.className = `p-3 rounded-xl text-xs font-semibold text-center ${isError ? "bg-red-50 text-red-700 border border-red-200" : "bg-sky-50 text-slate-800 border border-sky-200"}`;
  box.classList.remove("hidden");
  if (window.gsap) gsap.fromTo(box, { scale:.97, opacity:0 }, { scale:1, opacity:1, duration:.25 });
}

window.toggleAuthMode = function () {
  authMode = authMode === "login" ? "register" : "login";
  const registering = authMode === "register";
  $("auth-title").textContent = registering ? "Crear Cuenta" : "Iniciar Sesión";
  $("auth-subtitle").textContent = registering ? "Regístrate para comenzar a gestionar tus ventas" : "Ingresa con tus credenciales para acceder a tus registros";
  $("auth-submit-btn").textContent = registering ? "Registrarse" : "Iniciar Sesión";
  $("auth-toggle-mode-btn").innerHTML = registering
    ? '¿Ya tienes cuenta? <span class="text-slate-900 underline">Inicia Sesión</span>'
    : '¿No tienes cuenta? <span class="text-slate-900 underline">Regístrate aquí</span>';
  $("forgot-password-container").classList.toggle("hidden", registering);
  $("google-auth-container").classList.toggle("hidden", registering);
  $("auth-alert").classList.add("hidden");
};

window.showForgotPasswordView = function () {
  authMode = "forgot";
  $("auth-title").textContent = "Recuperar Contraseña";
  $("auth-subtitle").textContent = "Te enviaremos instrucciones a tu correo";
  $("auth-submit-btn").textContent = "Enviar Enlace de Recuperación";
  $("password-field-container").classList.add("hidden");
  $("forgot-password-container").classList.add("hidden");
  $("google-auth-container").classList.add("hidden");
  $("auth-toggle-mode-btn").classList.add("hidden");
  $("auth-back-login-btn").classList.remove("hidden");
  $("auth-alert").classList.add("hidden");
};

window.cancelPasswordReset = function () {
  authMode = "login";
  $("auth-title").textContent = "Iniciar Sesión";
  $("auth-subtitle").textContent = "Ingresa con tus credenciales para acceder a tus registros";
  $("auth-submit-btn").textContent = "Iniciar Sesión";
  $("password-field-container").classList.remove("hidden");
  $("forgot-password-container").classList.remove("hidden");
  $("google-auth-container").classList.remove("hidden");
  $("auth-toggle-mode-btn").classList.remove("hidden");
  $("auth-back-login-btn").classList.add("hidden");
  $("auth-alert").classList.add("hidden");
};

window.handleEmailAuth = async function (event) {
  event.preventDefault();
  const email = $("auth-email").value.trim();
  const password = $("auth-password").value;
  const button = $("auth-submit-btn");
  button.disabled = true;
  try {
    if (authMode === "register") {
      const credential = await createUserWithEmailAndPassword(auth, email, password);
      await sendEmailVerification(credential.user);
      showAuthAlert("¡Cuenta registrada! Te enviamos un correo de verificación.", false);
      window.setTimeout(window.cancelPasswordReset, 3500);
    } else if (authMode === "login") {
      await signInWithEmailAndPassword(auth, email, password);
      // El observador de Firebase redirige al dashboard.
    } else {
      await sendPasswordResetEmail(auth, email);
      showAuthAlert("Correo de restablecimiento enviado. Revisa tu bandeja.", false);
    }
  } catch (error) {
    showAuthAlert(error.message || "No se pudo completar la operación.");
  } finally {
    button.disabled = false;
  }
};

window.loginWithGoogle = async function () {
  try {
    googleProvider.setCustomParameters({ prompt:"select_account" });
    await signInWithPopup(auth, googleProvider);
  } catch (error) {
    showAuthAlert(error.message || "No se pudo iniciar sesión con Google.");
  }
};

// Si ya existe una sesión, no mostramos el formulario otra vez.
onAuthStateChanged(auth, (user) => {
  if (user) window.location.replace("./dashboard.html");
});
