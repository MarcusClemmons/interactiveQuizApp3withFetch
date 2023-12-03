import { initializeApp } from "https://www.gstatic.com/firebasejs/10.6.0/firebase-app.js";


const firebaseConfig = {
  apiKey: "AIzaSyBgDZ_bJc3JYa_T5gO85hWx78u8T3pqn58",
  authDomain: "marcus-quiz-app.firebaseapp.com",
  projectId: "marcus-quiz-app",
  storageBucket: "marcus-quiz-app.appspot.com",
  messagingSenderId: "84005946264",
  appId: "1:84005946264:web:bcc96a93b53cc55482e1ed"
};
const app = initializeApp(firebaseConfig);

export {app}

