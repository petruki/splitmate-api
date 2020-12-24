/* eslint-disable no-console */
const Switcher = require('switcher-client');

const apiKey = process.env.SWITCHER_API_KEY;
const url = process.env.SWITCHER_API_URL;
const offline = process.env.SWITCHER_API_OFFLINE === 'true';
const environment = process.env.SWITCHER_ENV || 'default';
const domainName = 'SpliteMATE';
const component = 'splitmate-api';
let switcher;

async function initSwitcher() {
    if (!switcher) {
        switcher = new Switcher(url, apiKey, domainName, component, environment, 
            { snapshotLocation: 'snapshot/', offline });
    
        if (offline) {
            console.log('Loading Switcher snapshot...');
            await switcher.loadSnapshot();
            console.log('Snapshot loaded');
        }
    }
}

async function checkSignUp(email) {
    await initSwitcher();

    if (!await switcher.isItOn('SIGNUP', [
        Switcher.StrategiesType.VALUE, email])) {
            throw new Error(`Email ${email} not allowed`); 
    }
}

async function checkSendMail(action) {
    await initSwitcher();

    if (!await switcher.isItOn('SENDMAIL', [
        Switcher.StrategiesType.VALUE, action])) {
        throw new Error('Send email is not available');  
    }
}

module.exports = {
    checkSignUp,
    checkSendMail
};