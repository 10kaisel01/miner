/**
 * CONFIGURACIÓN DE FIREBASE — completá esto con los datos de TU proyecto.
 *
 * Pasos:
 * 1. Andá a https://console.firebase.google.com/ y creá un proyecto (es gratis).
 * 2. Adentro del proyecto: "Compilación" → "Realtime Database" → "Crear base de datos".
 *    - Elegí la ubicación que prefieras.
 *    - Empezá en "modo de prueba" (lectura/escritura abiertas por 30 días) para probar rápido.
 *      Antes de compartir el link con más gente, configurá reglas (ver abajo).
 * 3. En el panel del proyecto: ícono de engranaje → "Configuración del proyecto" →
 *    bajá hasta "Tus apps" → creá una app web (</>) → copiá el objeto `firebaseConfig`
 *    que te muestra y pegalo abajo, reemplazando el objeto de ejemplo.
 * 4. Guardá este archivo y subilo junto con los demás (index.html, style.css, game.js)
 *    a tu repositorio de GitHub. Si usás GitHub Pages, andá a
 *    Settings → Pages → Source y elegí la rama/carpeta donde está el index.html.
 *
 * Si este archivo queda con los valores de ejemplo (sin completar), el juego
 * simplemente no encuentra una configuración válida y usa el modo de respaldo
 * (o solitario si tampoco hay storage disponible) — no rompe nada.
 *
 * IMPORTANTE — reglas de seguridad recomendadas para Realtime Database
 * (pestaña "Reglas" dentro de Realtime Database), antes de compartir el link
 * públicamente:
 *
 *   {
 *     "rules": {
 *       "players": {
 *         ".read": true,
 *         ".write": true,
 *         "$playerId": {
 *           ".validate": "newData.hasChildren(['name','x','y','z','stage'])"
 *         }
 *       }
 *     }
 *   }
 *
 * Esto sigue siendo público (cualquiera con el link ve y escribe en "players"),
 * pero al menos valida la forma de los datos. Los datos de "players" son efímeros
 * (posición/nombre mientras juegan), no hay información sensible involucrada.
 */

const FIREBASE_CONFIG = {
  apiKey: "TU_API_KEY",
  authDomain: "TU_PROYECTO.firebaseapp.com",
  databaseURL: "https://TU_PROYECTO-default-rtdb.firebaseio.com",
  projectId: "TU_PROYECTO",
  storageBucket: "TU_PROYECTO.appspot.com",
  messagingSenderId: "000000000000",
  appId: "1:000000000000:web:xxxxxxxxxxxxxxxxxxxxxx",
};
