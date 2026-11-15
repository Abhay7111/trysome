const express = require('express')
const AuthRoute = express.Router()

const AuthController = require('../controllers/Auth.controller')
const authenticate = require('../middleware/auth.middleware')

AuthRoute.post('/register', AuthController.UserRegister)
AuthRoute.post('/login', AuthController.UserLogin)
AuthRoute.get('/getme', authenticate, AuthController.GetMe)

module.exports = AuthRoute