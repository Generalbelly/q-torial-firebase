import { URL } from 'url';
import TutorialEntity, { Parameter } from './Entities/TutorialEntity';
import GaEntity from './Entities/GaEntity';
import { validateUrlPath } from './Entities/PathOperators';
import admin from './admin';
import functions from './functions';
import StepEntity from './Entities/StepEntity';

export const getTutorial = functions.https.onRequest(async (request, response) => {
  response.set('Access-Control-Allow-Origin', '*');
  if (request.method === 'OPTIONS') {
    response.set('Access-Control-Allow-Methods', 'POST');
    response.set('Access-Control-Allow-Headers', 'Content-Type');
    response.set('Access-Control-Max-Age', '3600');
    return response.status(204).send('');
  } else if (request.method === 'POST') {
    response.set('Cache-Control', 'public, max-age=300, s-maxage=600');
    // TODO 外部に公開することはないと思うが、そうなったらしっかりバリデーションをかける
    if (request.body === undefined || request.body.url === undefined || request.body.key === undefined || request.body.once === undefined) {
      return response.status(422).send('Unprocessable Entity');
    }
    let selectedTutorial: TutorialEntity|null = null;
    let ga: object|null = null;
    const url = new URL(request.body.url);
    const userKey = request.body.key;
    const once: string[] = request.body.once;

    const tutorialRefs: FirebaseFirestore.QuerySnapshot = await admin.firestore().collection("users").doc(userKey).collection('tutorials').where('isActive', '==', true).orderBy('pathPriority', 'asc').get();
    // tutorialsをループしてpathvalueをチェックする
    const matchedTutorials: TutorialEntity[] = [];
    tutorialRefs.forEach(ref => {
      const tutorial = ref.data();
      if (!once.includes(ref.id) && validateUrlPath(tutorial.pathOperator, tutorial.pathValue, url.pathname)) {
        let hasSameParameters = true;
        tutorial.parameters.forEach((parameter: Parameter) => {
          if (url.searchParams.get(parameter.key) !== parameter.value) {
            hasSameParameters = false;
          }
        });
        if (hasSameParameters) {
          const tutorialEntity = new TutorialEntity({
            ...tutorial,
            id: ref.id,
          });
          if (!tutorialEntity.domain || (tutorialEntity.domain && new URL(tutorialEntity.domain).hostname === url.hostname)) {
            matchedTutorials.push(tutorialEntity);
          }
        }
      }
    });
    if (matchedTutorials.length > 0) {
      selectedTutorial = matchedTutorials[0];
    }
    if (selectedTutorial) {
      const selectedTutorialRef = admin.firestore().collection("users").doc(userKey).collection('tutorials').doc(selectedTutorial.id!)
      const stepRefs = await selectedTutorialRef.collection('steps').orderBy('order', 'asc').get();
      selectedTutorial.steps = stepRefs.docs.map(ref => {
        return new StepEntity({
          id: ref.id,
          ...ref.data()
        });
      })
      if (selectedTutorial.gaId) {
        const gaRef = await admin.firestore().collection("users").doc(userKey).collection('gas').doc(selectedTutorial.gaId).get();
        if (gaRef.exists) {
          ga = new GaEntity({
            id: gaRef.id,
            ...gaRef.data(),
          });
        }
      }
    }
    return response.status(200).send({
      tutorial: selectedTutorial,
      ga,
    });
  }
  return response.status(405).send('Method Not Allowed');
});

export const storePerformance = functions.https.onRequest(async (request, response) => {
  response.set('Access-Control-Allow-Origin', '*');
  if (request.method === 'OPTIONS') {
    response.set('Access-Control-Allow-Methods', 'POST');
    response.set('Access-Control-Allow-Headers', 'Content-Type');
    response.set('Access-Control-Max-Age', '3600');
    return response.status(204).send('');
  } else if (request.method === 'POST') {
    const tutorialId: string = request.body.tutorialId;
    const userKey: string = request.body.key;
    if (!request.body || !tutorialId) {
      return response.status(422).send('Unprocessable Entity');
    }
    const ref = admin.firestore().collection("users").doc(userKey).collection('tutorials').doc(tutorialId).collection("performances").doc();
    await ref.set({
      completeSteps: request.body.completeSteps,
      allSteps: request.body.allSteps,
      complete: request.body.complete,
      elapsedTime: request.body.elapsedTime,
      euId: request.body.euId,
      createdAt: admin.firestore.FieldValue.serverTimestamp(),
      updatedAt: admin.firestore.FieldValue.serverTimestamp(),
    });
    return response.sendStatus(200);
  }
  return response.status(405).send('Method Not Allowed');
});