import firebase from 'firebase/app'
import 'firebase/firestore'

var firebaseConfig = {
    apiKey: "AIzaSyDzJr78xXPyMBgLZM6485nj3ULFwbdZi5o",
    authDomain: "sveltesf4.firebaseapp.com",
    databaseURL: "https://sveltesf4.firebaseio.com",
    projectId: "sveltesf4",
    storageBucket: "sveltesf4.appspot.com",
    messagingSenderId: "685304491415",
    appId: "1:685304491415:web:7d406a321ebca0a11328d2"
  };
  // Initialize Firebase
  firebase.initializeApp(firebaseConfig);

  export const db = firebase.firestore()