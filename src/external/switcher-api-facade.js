const { Switcher, checkValue } = require('switcher-client');
const { logger } = require('../util');

const apiKey = process.env.SWITCHER_API_KEY;
const url = process.env.SWITCHER_API_URL;
const offline = process.env.SWITCHER_API_OFFLINE === 'true';
const environment = process.env.SWITCHER_ENV || 'default';
const domain = 'SpliteMATE';
const component = 'splitmate-api';

Switcher.buildContext(
    { url, apiKey, domain, component, environment },
    { snapshotLocation: 'snapshot/', offline });

const switcher = Switcher.factory();

async function initSwitcher() {
    if (offline) {
        logger('switcher-api', 'Loading Switcher snapshot...');
        await Switcher.loadSnapshot();
        logger('switcher-api', 'Switcher loaded');
    }
}

async function checkSignUp(email) {
    await initSwitcher();

    if (!await switcher.isItOn('SIGNUP', [checkValue(email)])) {
            throw new Error(`Email ${email} not allowed`); 
    }
}

async function checkSendMail(action) {
    await initSwitcher();

    if (!await switcher.isItOn('SIGNUP', [checkValue(action)])) {
        throw new Error('Send email is not available');  
    }
}

module.exports = {
    checkSignUp,
    checkSendMail
};