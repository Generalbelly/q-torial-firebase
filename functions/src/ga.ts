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

export const addGa = functions.https.onCall((data: any, context: functions.https.CallableContext) => {
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
      const ref = admin.firestore().collection("users").doc(auth.uid).collection('gas').doc();
      const ga = {
        email: email,
        refreshToken: refresh_token,
        accessToken: response.token,
        createdAt: admin.firestore.FieldValue.serverTimestamp(),
        updatedAt: admin.firestore.FieldValue.serverTimestamp(),
      };
      await ref.set(ga);
      resolve({
        id: ref.id,
        ...ga
      }); 
    } catch (error) {
      reject(error);
    }
  });
});

export const queryAccounts = functions.https.onCall((data: any, context: functions.https.CallableContext) => {
  return new Promise(async (resolve, reject) => {

    const { auth } = context;
    if (!auth) {
      throw new functions.https.HttpsError('failed-precondition', 'The function must be called while authenticated.');
    }

    const { id } = data;
    if (!id) {
      throw new functions.https.HttpsError('invalid-argument', 'The function must be called with one arguments "id".');
    }
    const snap = await admin.firestore().collection("users").doc(auth.uid).collection('gas').doc(id).get();
    const ga = snap.data();
    if (!ga) {
      throw new functions.https.HttpsError('not-found', `ga(id:${id}) not found.`);
    }
    oauth2Client.setCredentials({ refresh_token: ga.refreshToken });
    
    try {
      const apiClient = google.analytics({
        auth: oauth2Client,
        version: "v3",
      });
      const response = await apiClient.management.accounts.list();
      let accounts:any[] = [];
      if (response.data.items) {
        accounts = await Promise.all(response.data.items.filter(item => item.id).map(async (account) => {
          const res = await apiClient.management.webproperties.list({
            accountId: account.id,
          });
          return {
            ...account,
            webProperties: res.data.items,
          };
        }));
      }
      resolve(accounts); 
    } catch (error) {
      reject(error);
    }
  });
});

export const onGaDelete = functions.firestore
  .document('/users/{userID}/gas/{oauthID}')
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
