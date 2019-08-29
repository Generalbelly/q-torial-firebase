import TutorialEntity from './Entities/TutorialEntity';
import { validateUrlPath, PATH_ALL, PATH_REGEX, PATH_STARTS_WITH, PATH_EQUALS } from './Entities/PathOperators';
import admin from './admin';
import functions from './functions';
import StepEntity from './Entities/StepEntity';


exports.tutorials = functions.https.onRequest(async (request, response) => {
  response.set('Access-Control-Allow-Origin', '*');
  if (request.method === 'OPTIONS') {
  // Send response to OPTIONS requests
    response.set('Access-Control-Allow-Methods', 'GET');
  } else {
    const url = request.query.url;
    const userKey = request.query.key;
    const tutorialRefs = await admin.firestore().collection("users").doc(userKey).collection('tutorials').get();
    // tutorialsをループしてpathvalueをチェックする
    const matchedTutorials: TutorialEntity[] = [];
    tutorialRefs.forEach(ref => {
      const tutorial = ref.data();
      if (tutorial.isActive && validateUrlPath(tutorial.pathOperator, tutorial.pathValue, url)) {
        const tutorialEntity = new TutorialEntity({
          ...tutorial,
          id: ref.id,
        });
        matchedTutorials.push(tutorialEntity);        
      }
    });

    let selectedTutorial: TutorialEntity|null = null;
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
      const stepRefs = await admin.firestore().collection("users").doc(userKey).collection('tutorials').doc(selectedTutorial.id!).collection('steps').orderBy('order', 'asc').get();
      selectedTutorial.steps = stepRefs.docs.map(ref => {
        return new StepEntity({
          id: ref.id,
          ...ref.data()
        });
      })
    }
    response.status(200).send(selectedTutorial);
  }
});