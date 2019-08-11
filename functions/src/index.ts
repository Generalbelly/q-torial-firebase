import admin from './admin';
import functions from './functions';
import { onTutorialDelete } from './tutorial';
import { addGa, queryAccounts, onGaDelete } from './ga';

admin.initializeApp(functions.config().firebase);

exports.onTutorialDelete = onTutorialDelete;

exports.addGa = addGa;
exports.queryAccounts = queryAccounts;
exports.onGaDelete = onGaDelete;
