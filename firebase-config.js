import { initializeApp } from "firebase/app";
import { getAnalytics } from "firebase/analytics";

const firebaseConfig = {
  apiKey: "AIzaSyBgMxlHqISnS3apMqvlQGfiEf6BreLnzIk",
  authDomain: "miner-ab248.firebaseapp.com",
  databaseURL: "https://miner-ab248-default-rtdb.firebaseio.com",
  projectId: "miner-ab248",
  storageBucket: "miner-ab248.firebasestorage.app",
  messagingSenderId: "927612921498",
  appId: "1:927612921498:web:0242f08ac71f9dd4752123",
  measurementId: "G-HG149MSG7Z"
};

const app = initializeApp(firebaseConfig);
const analytics = getAnalytics(app);
