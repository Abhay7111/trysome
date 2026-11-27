
const express = require('express');
const app = express()
const cors = require('cors')
const cookieParser = require('cookie-parser')
const corsOrigin = require('./config/cors.config')

const AuthRoute = require('./routes/auth.route')
const PublicRoute = require('./routes/PublicData.route')
const PostRoute = require('./routes/post.route')
const UserRoute = require('./routes/user.route')
const ChatRoute = require('./routes/chat.route')
const NotificationRoute = require('./routes/notification.route')

app.use(express.json())
app.use(cookieParser())
app.use(cors({
    origin: corsOrigin,
    credentials: true
}))
app.use('/api/auth', AuthRoute)
app.use('/api', PublicRoute)
app.use('/api/post', PostRoute)
app.use('/api/users', UserRoute)
app.use('/api/chat', ChatRoute)
app.use('/api/notifications', NotificationRoute)

app.get('/', (req, res) => {
    res.send("server is running")
})

module.exports = app