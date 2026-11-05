// Animación de bienvenida reutilizada en login y dashboard.
(() => {
  const target = document.getElementById("welcome-typewriter-text") || document.getElementById("board-typewriter-text");
  if (!target) return;
  const message = "Bienvenido a tu plataforma comercial";
  if (window.matchMedia?.("(prefers-reduced-motion: reduce)").matches) { target.textContent = message; return; }
  let index = 0;
  const tick = () => { if (index < message.length) { target.textContent += message.charAt(index++); window.setTimeout(tick, 62); } };
  window.setTimeout(tick, 350);
})();
