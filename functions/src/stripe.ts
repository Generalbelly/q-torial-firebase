import admin from './admin';
import functions from './functions';

// TODO: firebase functions:config:set stripe.token="SECRET_STRIPE_TOKEN_HERE"
// TODO: firebase functions:config:set stripe.endingSecret="ENDING_SECRET"
const stripe = require('stripe')(functions.config().stripe.token);
const endpointSecret = functions.config().stripe.ending_secret

export const stripeWebhook = functions.https.onRequest(async (request, response) => {
  response.set('Access-Control-Allow-Origin', '*');
  if (request.method === 'OPTIONS') {
    response.set('Access-Control-Allow-Methods', 'POST');
    response.set('Access-Control-Allow-Headers', 'Content-Type');
    response.set('Access-Control-Max-Age', '3600');
    return response.status(204).send('');
  } else if (request.method === 'POST') {
		let event: any;
		try {
			const sig = request.headers["stripe-signature"];
			// Verify the request against our endpointSecret
			event = stripe.webhooks.constructEvent(request.rawBody, sig, endpointSecret);
		} catch (e) {
			return response.status(400).send(`Webhook Error: ${e.message}`);
		}
		if (event.type === 'checkout.session.completed') {
			const userKey = event.data.object.client_reference_id;
			const customerId = event.data.object.customer;
			console.log(event.data)
			const subscriptionId = event.data.subscription.id;
			await admin.firestore().collection("stripe_customers").doc(userKey).set({
				stripeCustomerId: customerId,
				stripeSubscriptionId: subscriptionId,
			}, { merge: true });
			return response.status(200).json({received: true});
		}
		return response.status(200).json({received: false});
  }
  return response.status(405).send('Method Not Allowed');
});

export const cancelSubscription = functions.https.onCall((data: any, context: functions.https.CallableContext) => {
	return new Promise(async (resolve, reject) => {
		const { auth } = context;
		if (!auth) {
			throw new functions.https.HttpsError('failed-precondition', 'The function must be called while authenticated.');
		}
		try {
			const snapshot = await admin.firestore().collection("users").doc(auth.uid).get();
			const user: any = snapshot.data()
			if (!user.stripeSubscriptionId || !user.stripeCustomerId) {
				throw new functions.https.HttpsError('failed-precondition', 'The function must be called when user has a paid plan.');
			}
			stripe.subscriptions.del(user.stripeSubscriptionId);
			await snapshot.ref.update({
				stripeCustomerId: null,
				stripeSubscriptionId: null,
			})
			resolve(true); 
		} catch (error) {
			console.error(error);
			reject(false);
		}
	});
});