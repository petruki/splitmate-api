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
    return await switcher.isItOn('SIGNUP', [
        Switcher.StrategiesType.VALUE, email]);
}

module.exports = {
    checkSignUp
}