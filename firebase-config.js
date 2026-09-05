// Configuración de TU proyecto de Firebase (Realtime Database).
// Importante: index.html ya cargó firebase-app-compat.js y
// firebase-database-compat.js ANTES que este archivo, así que acá
// NO se usa `import` (eso solo funciona con un bundler/npm) ni se llama
// a initializeApp — eso lo hace game.js una sola vez, usando este objeto.
//
// La variable tiene que llamarse exactamente FIREBASE_CONFIG (todo en
// mayúsculas): así es como game.js la busca para decidir si hay que
// prender el modo "Firebase (en vivo)".
const FIREBASE_CONFIG = {
  apiKey: "AIzaSyBgMxlHqISnS3apMqv1QGfiEf6BreLnzIk",
  authDomain: "miner-ab248.firebaseapp.com",
  databaseURL: "https://miner-ab248-default-rtdb.firebaseio.com",
  projectId: "miner-ab248",
  storageBucket: "miner-ab248.firebasestorage.app",
  messagingSenderId: "927612921498",
  appId: "1:927612921498:web:0242f08ac71f9dd4752123",
  measurementId: "G-HG149MSG7Z"
};
