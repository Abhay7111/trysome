require('dotenv').config()
const app = require('./src/app');
const connectToDB = require('./src/config/connect.config')

app.listen(process.env.PORT, () => {
    console.log('server is running')
    connectToDB()
})