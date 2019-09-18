// // tslint:disable-next-line: no-implicit-dependencies
// import { GaxiosError } from 'gaxios';
// // tslint:disable-next-line: no-implicit-dependencies
// import { Credentials } from 'google-auth-library';
// import { google } from "googleapis";

// import stagingSecret from "./stagingSecret";
// import admin from './admin';
// import functions from './functions';

// // oauth for google analytics
// let googleSecrets;
// if (process.env.GCLOUD_PROJECT === 'q-torial') {
//     googleSecrets = "";
// } else {
//     googleSecrets = stagingSecret;
// }

// const clientId = googleSecrets.web.client_id;
// const clientSecret = googleSecrets.web.client_secret;
// // Don't use an actual redirect uri from our list of valid uri's. Instead, it needs to be postmessage.
// // https://stackoverflow.com/a/48121098/7621726
// const redirectUri = 'postmessage';

// const oauth2Client = new google.auth.OAuth2(
//   clientId,
//   clientSecret,
//   redirectUri
// );

// export const getReport = functions.https.onCall((data: any, context: functions.https.CallableContext) => {
//   return new Promise(async (resolve, reject) => {

//     const { auth } = context;
//     if (!auth) {
//       throw new functions.https.HttpsError('failed-precondition', 'The function must be called while authenticated.');
//     }

//     const { gaId } = data;
//     if (!gaId) {
//       throw new functions.https.HttpsError('invalid-argument', 'The function must be called with one arguments "gaId".');
//     }
//     const snap = await admin.firestore().collection('users').doc(auth.uid).collection('gas').doc(gaId).get();
//     const ga = snap.data();
//     if (!ga) {
//       throw new functions.https.HttpsError('not-found', `ga(id:${gaId}) not found.`);
//     }
//     oauth2Client.setCredentials({ refresh_token: ga.refreshToken });
    
//     try {
//       const apiClient = google.analyticsreporting({
//         version: 'v4', auth: oauth2Client
//       });
//       const response = await apiClient.reports.batchGet({

//       })
//       console.log(response)
//       resolve(response); 
//     } catch (error) {
//       reject(error);
//     }
//   });
// });
