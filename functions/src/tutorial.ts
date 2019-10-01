import functions from './functions';
import PathOperators from './Entities/PathOperators';

export const onTutorialCreate = functions.firestore
  .document('/users/{userID}/tutorials/{tutorialID}')
  .onCreate(async (snap, context) => {
    const newValue: any = snap.data()
    const pathPriority = PathOperators.find(p => p.value === newValue.pathOperator)!.pathPriority
    try {
      await snap.ref.update({
        pathPriority 
      })
      return true;
    } catch (error) {
      console.error(error);
      return false;
    }
  });

export const onTutorialUpdate = functions.firestore
  .document('/users/{userID}/tutorials/{tutorialID}')
  .onUpdate(async (snap, context) => {
    const newValue: any = snap.after.data()
    const pathPriority = PathOperators.find(p => p.value === newValue.pathOperator)!.pathPriority
    try {
      await snap.after.ref.update({
        pathPriority 
      })
      return true;
    } catch (error) {
      console.error(error);
      return false;
    }
  });

export const onTutorialDelete = functions.firestore
  .document('/users/{userID}/tutorials/{tutorialID}')
  .onDelete(async (snap, context) => {
    try {
      const querySnapshot = await snap.ref.collection('steps').get();
      await Promise.all(querySnapshot.docs.map(doc => doc.ref.delete()));
      return true;
    } catch (error) {
      console.error(error);
      return false;
    }
  });
