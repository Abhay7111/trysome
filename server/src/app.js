
const express = require('express');
const app = express()
const cors = require('cors')

const AuthRoute = require('./routes/auth.route')
const PublicRoute = require('./routes/PublicData.route')

app.use(express.json())
app.use(cors())
app.use('/api/auth', AuthRoute)
app.use('/api', PublicRoute)

app.get('/', (req, res) => {
    res.send("server is running")
})

module.exports = app