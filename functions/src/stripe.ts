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
		console.log(event.type);
		if (event.type === 'checkout.session.completed') {
			const userKey = event.data.client_reference_id;
			const customer = event.data.customer;
			await admin.firestore().collection("users").doc(userKey).set({
				customer,
			}, { merge: true });
		}
		return response.status(200).json({received: true});
  }
  return response.status(405).send('Method Not Allowed');
});
