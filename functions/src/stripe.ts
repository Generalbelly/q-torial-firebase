import admin from './admin';
import functions from './functions';
import StripeCustomerEntity from './Entities/StripeCustomerEntity';

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
			const subscriptionId = event.data.object.subscription;
			const stripeCustomerEntity = new StripeCustomerEntity({
				customerId: customerId,
				subscriptionId: subscriptionId,
				createdAt: admin.firestore.FieldValue.serverTimestamp(),
				updatedAt: admin.firestore.FieldValue.serverTimestamp(),
				deletedAt: null,
			});
			await admin.firestore().collection("users").doc(userKey).collection("stripe_customers").add(stripeCustomerEntity.toPlainObject());
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
		const { id } = data;
		try {
			const snapshot = await admin.firestore().collection("users").doc(auth.uid).collection("stripe_customers").doc(id).get();
			const d = snapshot.data()
			if (d) {
				const stripeCustomer: StripeCustomerEntity = new StripeCustomerEntity(d)
				if (!stripeCustomer.subscriptionId || !stripeCustomer.customerId) {
					throw new functions.https.HttpsError('failed-precondition', 'The function must be called when subscriptionId and customerId are fullfilled.');
				}
				stripe.subscriptions.update(stripeCustomer.subscriptionId, {cancel_at_period_end: true});
//				stripe.subscriptions.del(stripeCustomer.subscriptionId);
				await snapshot.ref.update({
					deletedAt: admin.firestore.FieldValue.serverTimestamp(),
					updatedAt: admin.firestore.FieldValue.serverTimestamp(),
				})
			}
			resolve(true); 
		} catch (error) {
			console.error(error);
			reject(false);
		}
	});
});