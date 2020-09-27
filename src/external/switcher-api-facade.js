const Switcher = require('switcher-client');

const apiKey = process.env.SWITCHER_API_KEY;
const url = process.env.SWITCHER_API_URL;
const offline = process.env.SWITCHER_API_OFFLINE === 'true';
const environment = 'default';
const domainName = 'Rice and Beans';
const component = 'splitmate-api';
let switcher;

async function initSwitcher() {
    if (!switcher) {
        console.log('Loading Switcher snapshot');
        switcher = new Switcher(url, apiKey, domainName, component, environment, 
            { snapshotLocation: 'snapshot/', offline });
    
        if (offline)
            await switcher.loadSnapshot();
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
        throw new Error(`Send email is not available`);  
    }
}

module.exports = {
    checkSignUp,
    checkSendMail
}