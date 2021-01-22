const axios = require('axios');
const sendGridApiUrl = 'https://api.sendgrid.com/v3/mail/send';

function sendInvite(email, eventName) {
    sendMail(email, eventName, null, process.env.SENDGRID_INVITE_TEMPLATE);
}

function sendReminder(email, eventName, items) {
    sendMail(email, eventName, items, process.env.SENDGRID_REMINDER_TEMPLATE);
}

function sendMail(email, eventName, items, template_id) {
    axios.post(sendGridApiUrl, {
        from: { email: process.env.SENDGRID_MAIL_FROM },
        personalizations: [{
            to: [{ email }],
            dynamic_template_data: {
                eventName,
                items
            }
        }],
        template_id
    }, { 
        headers: {
            Authorization: `Bearer ${process.env.SENDGRID_API_KEY}`,
            'Content-Type': 'application/json'
        }
    });
}

module.exports = {
    sendInvite,
    sendReminder
};