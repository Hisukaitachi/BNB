require('dotenv').config({ path: __dirname + '/.env' });
console.log('PAYMONGO_SECRET_KEY:', process.env.PAYMONGO_SECRET_KEY);