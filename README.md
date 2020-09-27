![Splitmate API](https://raw.githubusercontent.com/Rice-Beans/assets/master/splitmate/logo/splitmate.jpg)

[![Build Status](https://travis-ci.com/Rice-Beans/splitmate-api.svg?branch=master)](https://travis-ci.com/Rice-Beans/splitmate-api)

# Requirements  
- NodeJS
- MongoDB
- Postman (for testing using samples located at requests/)

# Configuration
1) npm install
2) Add .env-cmdrc file into the project directory.

Example:
```
{
  "dev": {
    "PORT": "3000",
    "MONGODB_URI": "mongodb://splitmate:splitmate@127.0.0.1:27017/splitmate-api",
    "JWT_SECRET": "[SECRET_HERE]",
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