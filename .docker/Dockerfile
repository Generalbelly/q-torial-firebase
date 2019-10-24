FROM node:8-alpine

RUN apk update && \
    apk upgrade && \
    apk add --no-cache \
    jq

WORKDIR /app

RUN yarn add -D firebase-tools

# TODO: firebase login
# I haven't implemented firebase login:ci thing yet.

WORKDIR /app/functions

RUN yarn install

WORKDIR /app

RUN . .env && eval "firebase functions:config:set $(cat config|tr "\n" " ")" \
    firebase use ${FIREBASE_PROJECT} --token ${FIREBASE_TOKEN} \
    # && firebase deploy --only hosting --token ${FIREBASE_TOKEN} \
    && firebase deploy --only firestore:rules --token ${FIREBASE_TOKEN} \
    && firebase deploy --only storage --token ${FIREBASE_TOKEN} \
    && firebase deploy --only functions --token ${FIREBASE_TOKEN}
