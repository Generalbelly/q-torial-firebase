import functions from './functions';

export const onTutorialDelete = functions.firestore
  .document('/users/{userID}/tutorials/{tutorialID}')
  .onDelete(async (snap, context) => {
    try {
      const querySnapshot = await snap.ref.collection('steps').get();
      await Promise.all(querySnapshot.docs.map(doc => doc.ref.delete()));
      return true;
    } catch (error) {
      console.log(error);
      return false;
    }
  });
