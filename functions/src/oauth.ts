// tslint:disable-next-line: no-implicit-dependencies
import { GaxiosError } from 'gaxios';
// tslint:disable-next-line: no-implicit-dependencies
import { Credentials } from 'google-auth-library';
import { google } from "googleapis";

import stagingSecret from "./stagingSecret";
import admin from './admin';
import functions from './functions';

// oauth for google analytics
let googleSecrets;
if (process.env.GCLOUD_PROJECT === 'q-torial') {
    googleSecrets = "";
} else {
    googleSecrets = stagingSecret;
}

const clientId = googleSecrets.web.client_id;
const clientSecret = googleSecrets.web.client_secret;
// Don't use an actual redirect uri from our list of valid uri's. Instead, it needs to be postmessage.
// https://stackoverflow.com/a/48121098/7621726
const redirectUri = 'postmessage';

const oauth2Client = new google.auth.OAuth2(
  clientId,
  clientSecret,
  redirectUri
);

 // Wrap callback in a promise.
const getToken = (code: string): Promise<Credentials> => {
  return new Promise((resolve: (token: Credentials) => void, reject: (err: GaxiosError) => void) => {
    oauth2Client.getToken(code, (err, token) => {
      if (err) {
        reject(err);
      } else if (token) {
        resolve(token);
      }
    })
  })
};

export const addOauth = functions.https.onCall((data: any, context: functions.https.CallableContext) => {
  return new Promise(async (resolve, reject) => {

    const { auth } = context;
    if (!auth) {
      throw new functions.https.HttpsError('failed-precondition', 'The function must be called while authenticated.');
    }

    const { code, email } = data;
    if (!code) {
      throw new functions.https.HttpsError('invalid-argument', 'The function must be called with one arguments "code" for getting access token.');
    }

    if (!email) {
      throw new functions.https.HttpsError('invalid-argument', 'The function must be called with one arguments "email".');
    }
  
    const { refresh_token } = await getToken(code);
    
    oauth2Client.setCredentials({ refresh_token: refresh_token });
    const response = await oauth2Client.getAccessToken();
    
    try {
      await admin.firestore().collection("users").doc(auth.uid).collection('oauths').add({
        service: 'google_analytics',
        email: email,
        refreshToken: refresh_token,
        accessToken: response.token,
        createdAt: admin.firestore.FieldValue.serverTimestamp(),
        updatedAt: admin.firestore.FieldValue.serverTimestamp(),
      });
      resolve(true); 
    } catch (error) {
      reject(error);
    }
  });
});

export const onOauthDelete = functions.firestore
  .document('/users/{userID}/oauths/{oauthID}')
  .onDelete(async (snap, context) => {
    const data = snap.data();
    if (!data) {
      throw new Error(`oauth not found: id is ${snap.id}`);
    }
    if (!data.accessToken) {
      throw new Error(`oauth does not have accessToken: id is ${snap.id}`);
    }
    await oauth2Client.revokeToken(data.accessToken);
  });

export const getGoogleAccessToken = functions.https.onCall(async (data: any, context: functions.https.CallableContext) => {
  const { auth } = context;
  if (!auth) return;
  const uid = auth.uid;
  const { oauthID } = data;

  const oauth = await admin.firestore().collection("users").doc(uid).collection('oauths').doc(oauthID).get();
  const oauthData = oauth.data();
  if (!oauthData) return;
  const refreshToken = oauthData.refreshToken;
  oauth2Client.setCredentials({ refresh_token: refreshToken });

  const response = await oauth2Client.getAccessToken();
  return response.token;
});
