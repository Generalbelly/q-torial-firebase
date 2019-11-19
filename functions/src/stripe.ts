import admin from './admin';
import functions from './functions';
import StripeCustomerEntity from './Entities/StripeCustomerEntity';
import {DocumentSnapshot} from "firebase-functions/lib/providers/firestore";

const stripe = require('stripe')(functions.config().stripe.token);
const endpointSecret = functions.config().stripe.ending_secret;

const cancel = async (stripeCustomerId: string|null, userKey: string|null, customerId: string|null, subscriptionId: string|null): Promise<boolean> => {
	if (!((customerId && subscriptionId) || (userKey && stripeCustomerId))) {
		throw Error("both of customerId and subscriptionId or userKey is required")
	}
	return new Promise(async (resolve, reject) => {
		try {
			let snapshot: DocumentSnapshot|null = null;
			if (stripeCustomerId && userKey) {
				snapshot = await admin.firestore()
					.collection("users")
					.doc(userKey)
					.collection("stripe_customers")
					.doc(stripeCustomerId)
					.get()
			} else if (customerId && subscriptionId) {
				const querySnapshot = await admin.firestore()
					.collectionGroup('stripe_customers')
					.where('customerId', '==', customerId)
					.where('subscriptionId', '==', subscriptionId)
					.where('deletedAt', '==', null)
					.limit(1)
					.get();
				if (querySnapshot.docs.length > 0) {
					snapshot = querySnapshot.docs[0]
				}
			}

			if (!snapshot) {
				console.error(`stripeCustomer not found(stripeCustomerId: ${stripeCustomerId}, customerId:${customerId}, subscriptionId:${subscriptionId}, userKey:${userKey}`);
				resolve(false);
				return
			}

			const data = snapshot.data();
			if (data) {
				const stripeCustomer: StripeCustomerEntity = new StripeCustomerEntity(data);
				stripe.subscriptions.update(stripeCustomer.subscriptionId, {cancel_at_period_end: true});
//				stripe.subscriptions.del(stripeCustomer.subscriptionId);
				await snapshot.ref.update({
					deletedAt: admin.firestore.FieldValue.serverTimestamp(),
					updatedAt: admin.firestore.FieldValue.serverTimestamp(),
				})
			}
			resolve(true)
		} catch (e) {
			console.error(e);
			reject(false)
		}
	})
};

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
			console.error(e);
			return response.status(400).send(`Webhook Error: ${e.message}`);
		}
		try {
			if (event.type === 'checkout.session.completed') {
				const userKey = event.data.object.client_reference_id;
				const customerId = event.data.object.customer;
				const subscriptionId = event.data.object.subscription;
				const stripeCustomerEntity = new StripeCustomerEntity({
					customerId,
					subscriptionId,
					createdAt: admin.firestore.FieldValue.serverTimestamp(),
					updatedAt: admin.firestore.FieldValue.serverTimestamp(),
					deletedAt: null,
				});
				await admin.firestore().collection("users").doc(userKey).collection("stripe_customers").add(stripeCustomerEntity.toPlainObject());
			} else if (event.type === 'customer.subscription.deleted' && !event.request) {
				const customerId = event.data.object.customer;
				const subscriptionId = event.data.object.id;
				await cancel(null, null, customerId, subscriptionId);
			}
		} catch (e) {
			console.error(e);
			return response.sendStatus(500);
		}
		return response.sendStatus(200);
  }
  return response.status(405).send('Method Not Allowed');
});

export const cancelSubscription = functions.https.onCall((data: any, context: functions.https.CallableContext) => {
	const { auth } = context;
	if (!auth) {
		throw new functions.https.HttpsError('failed-precondition', 'The function must be called while authenticated.');
	}
	return new Promise(async (resolve, reject) => {
		const { id } = data;
		try {
			const result = await cancel(id, auth.uid,null, null);
			resolve(result);
		} catch (error) {
			console.error(error);
			reject(false);
		}
	});
});
