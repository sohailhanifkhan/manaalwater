// Manaal Water — Firebase initialization (shared across pages)
// Uses the compat SDK via CDN so no build tools/bundler are needed.

const firebaseConfig = {
  apiKey: "AIzaSyAwhRZKZe7EdSEM9R5u-zGuxn4zyfTY9BU",
  authDomain: "manaal-water.firebaseapp.com",
  projectId: "manaal-water",
  storageBucket: "manaal-water.firebasestorage.app",
  messagingSenderId: "865002458645",
  appId: "1:865002458645:web:09779037b83501e4ce881c",
  measurementId: "G-68WTC0LMPX"
};

firebase.initializeApp(firebaseConfig);
const auth = firebase.auth();
const db = firebase.firestore();

// The one account allowed to see the owner dashboard.
// Change this if you ever want to log into the dashboard with a different address.
const OWNER_EMAIL = "manaalwater@gmail.com";
