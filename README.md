# Facturación & Notas — PWA modular

## Estructura
- `index.html`: entrada principal y login fullscreen.
- `login.html`: alias independiente del login.
- `dashboard.html`: interfaz principal protegida por Firebase Auth.
- `assets/css/`: estilos globales y estilos separados de login/dashboard.
- `assets/js/firebase.js`: inicialización compartida de Firebase y caché local de Firestore.
- `assets/js/auth.js`: inicio de sesión, registro, Google y recuperación.
- `assets/js/dashboard.js`: lógica de facturas, clientes, configuración e historial.
- `assets/js/animations.js`: efecto máquina de escribir.
- `assets/js/pwa.js`, `manifest.json`, `sw.js`: instalación y caché PWA.

## Ejecutar localmente
No abras los HTML con `file://`. Usa un servidor local, por ejemplo:

```bash
python -m http.server 8000
```

Después abre `http://localhost:8000`.

## Publicar
Sube toda la carpeta a un hosting con HTTPS (Firebase Hosting, Netlify, Vercel o similar). El service worker y la instalación PWA requieren HTTPS, excepto `localhost`.

## Firebase
Se conserva el proyecto Firebase original (`inovice-note`). En Firebase Console → Authentication → Settings → Authorized domains, agrega el dominio donde publiques el sitio. Conserva habilitados los métodos Email/Password y Google que utilices.

## Notas de funcionamiento
- El login redirige a `dashboard.html` cuando Firebase confirma la sesión.
- El dashboard comprueba la sesión y vuelve a `index.html` si no hay usuario autenticado.
- Se activa persistencia IndexedDB de Firestore cuando el navegador la permite. Los datos no consultados previamente y las operaciones que requieran conexión pueden seguir necesitando internet.
- El Service Worker almacena los archivos de la aplicación y guarda en caché recursos externos cuando el navegador los descarga; la primera carga necesita conexión.
- View Transitions API se activa mediante `@view-transition { navigation: auto; }` en navegadores compatibles. En otros navegadores, la navegación sigue funcionando normalmente.
- La clave `apiKey` de Firebase para aplicaciones web identifica el proyecto, pero debes proteger Firestore con reglas de seguridad adecuadas y restringir dominios/servicios en Google Cloud cuando corresponda.


## Seguridad de Firestore (acción requerida en Firebase Console)

Se incluye `firestore.rules` como base de reglas para aislar los datos por UID.
Antes de publicar, revisa y publica estas reglas en Firebase Console → Firestore Database → Rules.
No basta con incluir el archivo en el hosting: Firestore no lo aplica automáticamente.
La regla limita el acceso a `users/{uid}/...` al usuario autenticado cuyo UID coincide.

## Cambios de esta revisión
- Firebase reutiliza la aplicación predeterminada si ya fue inicializada.
- `dashboard.html` carga una sola implementación de la lógica del panel (`assets/js/dashboard.js`).
- Se escapan los principales campos de clientes, notas, productos y observaciones antes de insertarlos en HTML.
- Los folios nuevos usan un contador transaccional por usuario (`NOT-AAAA-000001`) para evitar colisiones entre creaciones simultáneas.
- Los totales de gastos consideran únicamente los gastos que se guardan en la nota.
- Los importes visibles respetan la moneda MXN/USD configurada.
- Se actualizó el Service Worker y se evita responder HTML como si fuera un archivo JS/CSS sin conexión.

## Importante
La configuración Firebase del proyecto original se conserva. La clave `apiKey` de Firebase Web no es una contraseña; la protección real depende de Authentication, reglas de Firestore y configuración del proyecto.
La carpeta `firestore.rules` debe publicarse manualmente en Firebase Console o mediante Firebase CLI. No se han modificado datos existentes.


## Navegación y módulos (actualización)

- **Inicio:** muestra estadísticas globales de clientes registrados, ventas brutas, inversión/gastos operativos y ganancia neta, además de las notas recientes.
- **Clientes:** permite abrir el expediente de cada cliente. Dentro del expediente se consultan sus ventas, inversión y ganancia; desde el botón **Crear Nota para Cliente** se abre el formulario con ese cliente seleccionado.
- **Crear Nota:** ya no aparece como opción independiente en el menú principal; se accede desde el expediente del cliente. La edición de notas existentes desde el historial sigue disponible.
- **Noticias del sistema:** sección nueva con el mensaje **Próximamente**, reservada para comunicar futuras funciones y actualizaciones.

Las estadísticas se calculan a partir de las notas almacenadas en la colección `users/{uid}/invoices` y los clientes de `users/{uid}/clients`. La inversión representa la suma de los gastos operativos capturados en cada nota; la ganancia es venta bruta menos dichos gastos.
