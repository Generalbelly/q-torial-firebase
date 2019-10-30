// tslint:disable-next-line: no-implicit-dependencies
import { GaxiosError } from 'gaxios';
// tslint:disable-next-line: no-implicit-dependencies
import { Credentials } from 'google-auth-library';
import { google } from "googleapis";

import admin from './admin';
import functions from './functions';

// oauth for google analytics
const credentials: any = functions.config().ga.credentials;
const clientId = credentials.client_id;
const clientSecret = credentials.client_secret;
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
    
    try {
      const ref = admin.firestore().collection("users").doc(auth.uid).collection('gas').doc();
      const ga = {
        email: email,
        refreshToken: refresh_token,
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
      const accountsRes = await apiClient.management.accounts.list();
      const accounts:any[] = await Promise.all(accountsRes.data.items!.map(async (account) => {
        const webPropertiesRes = await apiClient.management.webproperties.list({
          accountId: account.id,
        });
        const webProperties:any[] = await Promise.all(webPropertiesRes.data.items!.map(async (webProperty) => {
          const profilesRes = await apiClient.management.profiles.list({
            accountId: account.id,
            webPropertyId: webProperty.id,
          })
          return {
            ...webProperty,
            profiles: profilesRes.data.items,
          }
        }))
        return {
          ...account,
          webProperties,
        };
      }));
      resolve(accounts); 
    } catch (error) {
      reject(error);
    }
  });
});

export const onGaDelete = functions.firestore
  .document('/users/{userID}/gas/{gaID}')
  .onDelete(async (snap, context) => {
    try {
      const data = snap.data();
      if (!data) {
        throw new Error(`ga not found: id is ${snap.id}`);
      }
      if (!data.refreshToken) {
        throw new Error(`ga does not have refreshToken: id is ${snap.id}`);
      }
      oauth2Client.setCredentials({ refresh_token: data.refreshToken });
      const response = await oauth2Client.getAccessToken();
      await oauth2Client.revokeToken(response.token!);

      const userKey = context.params.userID
      const tutorials = await admin.firestore().collection("users").doc(userKey).collection('tutorials').where("gaId", "==", context.params.gaID).get();
      await Promise.all(tutorials.docs.map(doc => doc.ref.update({
        gaId: null,
      })));
      return true;
    } catch (error) {
      console.log(error);
      return false;
    }
  });
