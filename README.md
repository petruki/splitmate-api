![Splitmate API](https://raw.githubusercontent.com/Rice-Beans/assets/master/splitmate/logo/splitmate.jpg)

[![Build Status](https://travis-ci.com/Rice-Beans/splitmate-api.svg?branch=master)](https://travis-ci.com/Rice-Beans/splitmate-api)

# Requirements  
- NodeJS
- MongoDB
- Postman (for testing using samples located at requests/)

# Configuration
1) npm install
2) Add .env-cmdrc file into the project directory.

```
{
  "dev": {
    "PORT": "3000",
    "MONGODB_URI": "mongodb://127.0.0.1:27017/splitmate-api",
    "JWT_SECRET": "[SECRET_HERE]",
    "SENDGRID_API_KEY": "[SENDGRID_API_KEY]",
    "SENDGRID_MAIL_FROM": "splitmateapp@gmail.com",
    "SENDGRID_INVITE_TEMPLATE": "[SENDGRID_INVITE_TEMPLATE_ID]",
    "SENDGRID_REMINDER_TEMPLATE": "[SENDGRID_REMINDER_TEMPLATE_ID]",
    "SWITCHER_API_KEY": "[SWITCHER_API_KEY]",
    "SWITCHER_API_URL": "https://switcher-load-balance.herokuapp.com",
    "SWITCHER_API_OFFLINE": "true"
  },
  "prod": {
  },
  "test": {
  }
}
```

# How to colaborate
1. Open an issue describing your contribution
2. Fork, build, test, and submit your PR