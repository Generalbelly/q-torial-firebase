import { URL } from 'url';
import TutorialEntity, { Parameter } from './Entities/TutorialEntity';
import GaEntity from './Entities/GaEntity';
import { validateUrlPath, PATH_ALL, PATH_REGEX, PATH_STARTS_WITH, PATH_EQUALS } from './Entities/PathOperators';
import admin from './admin';
import functions from './functions';
import StepEntity from './Entities/StepEntity';

export const getTutorial = functions.https.onRequest(async (request, response) => {
  response.set('Access-Control-Allow-Origin', '*');
  if (request.method === 'OPTIONS') {
    response.set('Access-Control-Allow-Methods', 'GET');
    response.set('Access-Control-Allow-Headers', 'Content-Type');
    response.set('Access-Control-Max-Age', '3600');
    return response.status(204).send('');
  } else if (request.method === 'GET') {
    response.set('Cache-Control', 'public, max-age=300, s-maxage=600');
    if (!request.query.url || !request.query.key) {
      return response.status(422).send('Unprocessable Entity');
    }
    let selectedTutorial: TutorialEntity|null = null;
    let ga: object|null = null;
    const url = new URL(request.query.url);
    console.log('url.hostname', url.hostname);
    const userKey = request.query.key;
    const tutorialRefs = await admin.firestore().collection("users").doc(userKey).collection('tutorials').get();
    // tutorialsをループしてpathvalueをチェックする
    const matchedTutorials: TutorialEntity[] = [];
    tutorialRefs.forEach(ref => {
      const tutorial = ref.data();
      if (tutorial.isActive && validateUrlPath(tutorial.pathOperator, tutorial.pathValue, url.pathname)) {

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
    console.log('matchedTutorials', matchedTutorials);
    if (matchedTutorials.length === 1) {
      selectedTutorial = matchedTutorials[0];
    } else if (matchedTutorials.length > 0) {
      matchedTutorials.sort((a, b) => {
        if (a.pathOperator === b.pathOperator)  {
          return 0;
        }
        if (a.pathOperator === PATH_ALL) {
          return -1;
        }
        if (b.pathOperator === PATH_ALL) {
          return 1;
        }
        if (a.pathOperator === PATH_EQUALS) {
          return -1;
        }
        if (b.pathOperator === PATH_EQUALS) {
          return 1;
        }
        if (a.pathOperator === PATH_REGEX) {
          return -1;
        }
        if (b.pathOperator === PATH_REGEX) {
          return 1;
        }
        if (a.pathOperator === PATH_STARTS_WITH) {
          return -1;
        }
        if (b.pathOperator === PATH_STARTS_WITH) {
          return 1;
        }
        return 0;
      })
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
        const gaRef = await selectedTutorialRef.collection('gas').doc(selectedTutorial.gaId).get();
        ga = new GaEntity({
          id: gaRef.id,
          ...gaRef.data(),
        });
      }
    }
    return response.status(200).send({
      tutorial: selectedTutorial,
      ga,
    });
  }
  return response.status(405).send('Method Not Allowed');
});