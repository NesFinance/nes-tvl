import firebase from 'firebase'

const firebaseConfig = {
    apiKey: "apiKey",
    authDomain: "domain.firebaseapp.com",
    projectId: "projectId",
    storageBucket: "projectId.appspot.com",
    messagingSenderId: "messagingSenderId",
    appId: "1:appId:web:appId"
}

const firebaseApp = firebase.initializeApp(firebaseConfig)

export default firebaseApp