// Registro y actualización controlada de la PWA.
if ("serviceWorker" in navigator) {
  window.addEventListener("load", async () => {
    try {
      const registration = await navigator.serviceWorker.register("./sw.js", { updateViaCache: "none" });
      // Comprueba si hay una versión nueva al volver a abrir la aplicación.
      await registration.update();
    } catch (error) {
      console.warn("No se pudo registrar/actualizar el Service Worker:", error);
    }
  });
}
