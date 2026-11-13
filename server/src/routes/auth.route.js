const express = require('express')
const AuthRoute = express.Router()

const AuthController = require('../controllers/Auth.controller')

AuthRoute.post('/register', AuthController.UserRegister)
AuthRoute.post('/login', AuthController.UserLogin)
AuthRoute.get('/getme', AuthController.GetMe)

module.exports = AuthRoute