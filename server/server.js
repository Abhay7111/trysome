require('dotenv').config()
const { createServer } = require('http');
const { Server } = require('socket.io');
const app = require('./src/app');
const connectToDB = require('./src/config/connect.config')
const attachChatSocket = require('./src/services/chat-socket.service');

const httpServer = createServer(app);
const io = new Server(httpServer, {
    cors: {
        origin: process.env.CLIENT_URL || 'http://localhost:5173',
        credentials: true
    }
});

app.set('io', io);
attachChatSocket(io);

httpServer.listen(process.env.PORT, () => {
    console.log('server is running')
    connectToDB()
})