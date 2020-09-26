const Switcher = require('switcher-client');

const apiKey = process.env.SWITCHER_API_KEY;
const url = process.env.SWITCHER_API_URL;
const offline = process.env.SWITCHER_API_OFFLINE === 'true';
const environment = 'default';
const domainName = 'Rice and Beans';
const component = 'splitmate-api';

const switcher = new Switcher(url, apiKey, domainName, component, environment, 
    { snapshotLocation: 'snapshot/', offline });

switcher.loadSnapshot();

async function checkSignUp(email) {
    if (!await switcher.isItOn('SIGNUP', [
        Switcher.StrategiesType.VALUE, email])) {
            throw new Error(`Email ${email} not allowed`); 
    }
}

async function checkSendMail() {
    if (!await switcher.isItOn('SENDMAIL')) {
        throw new Error(`Send email is not available`);  
    }
}

module.exports = {
    checkSignUp,
    checkSendMail
}