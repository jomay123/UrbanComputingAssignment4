const firebaseConfig = {
    apiKey: "YOUR_KEY",
    authDomain: "urbancomputing-4a6fb.firebaseapp.com",
    databaseURL: "https://urbancomputing-4a6fb-default-rtdb.europe-west1.firebasedatabase.app",
    projectId: "urbancomputing-4a6fb",
    storageBucket: "urbancomputing-4a6fb.appspot.com",
    messagingSenderId: "xxxx",
    appId: "xxxx"
};

firebase.initializeApp(firebaseConfig);
const dbRef = firebase.database().ref("FusedData/BMP180");
