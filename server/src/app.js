
const express = require('express');
const app = express()
const cors = require('cors')
const cookieParser = require('cookie-parser')

const AuthRoute = require('./routes/auth.route')
const PublicRoute = require('./routes/PublicData.route')
const PostRoute = require('./routes/post.route')

app.use(express.json())
app.use(cookieParser())
app.use(cors({
    origin: process.env.CLIENT_URL || 'http://localhost:5173' || 'https://abhay7111-api-testing.netlify.app/',
    credentials: true
}))
app.use('/api/auth', AuthRoute)
app.use('/api', PublicRoute)
app.use('/api/post', PostRoute)

app.get('/', (req, res) => {
    res.send("server is running")
})

module.exports = app