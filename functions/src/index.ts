import * as admin from 'firebase-admin';
import * as functions from "firebase-functions";

admin.initializeApp(functions.config().firebase);

export const onTutorialDelete = functions.firestore
    .document('/users/{userID}/tutorials/{tutorialID}')
    .onDelete(async (snap, context) => {
        const querySnapshot = await snap.ref.collection('steps').get()
        await Promise.all(querySnapshot.docs.map(doc => doc.ref.delete()))
    });
