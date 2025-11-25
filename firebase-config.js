<script type="module">
import { initializeApp } from "https://www.gstatic.com/firebasejs/11.0.1/firebase-app.js";
import { getDatabase, ref, onValue } from "https://www.gstatic.com/firebasejs/11.0.1/firebase-database.js";

const firebaseConfig = {
  apiKey: "AIzaSyDvsN9YeemUvTD1fXBMnX5xCbXR3j5mFps",
  authDomain: "urbancomputing-4a6fb.firebaseapp.com",
  databaseURL: "https://urbancomputing-4a6fb-default-rtdb.europe-west1.firebasedatabase.app",
  projectId: "urbancomputing-4a6fb",
  storageBucket: "urbancomputing-4a6fb.firebasestorage.app",
  messagingSenderId: "551885169659",
  appId: "1:551885169659:web:6c27f1eddbc7c4ab63a15e"
};

const app = initializeApp(firebaseConfig);
const db = getDatabase(app);

// Listen for fused temperature updates
const fusedRef = ref(db, "FusedData/BMP180");
onValue(fusedRef, (snapshot) => {
    const data = snapshot.val();
    console.log("New fused map data:", data);
});
</script>
