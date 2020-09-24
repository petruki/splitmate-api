# Requirements  
- NodeJS
- MongoDB

# Configuration
1) npm install
2) Add .env-cmdrc file into the project directory.

Example:
```
{
  "dev": {
    "PORT": "3000",
    "MONGODB_URI": "mongodb://splitmate:splitmate@127.0.0.1:27017/splitmate-api",
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