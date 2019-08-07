import admin from './admin';
import functions from './functions';
import { onTutorialDelete } from './tutorial';
import { getGoogleAccessToken, addOauth, onOauthDelete } from './oauth';

admin.initializeApp(functions.config().firebase);

exports.onTutorialDelete = onTutorialDelete;
exports.getAccessToken = getGoogleAccessToken;

exports.addOauth = addOauth;
exports.onOauthDelete = onOauthDelete;
