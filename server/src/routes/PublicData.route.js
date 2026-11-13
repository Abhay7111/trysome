const express = require('express')

const PublicRoute = express.Router()

PublicRoute.get('/', (req, res) => {
    res.status(200).json({
        message: "this is Public route"
    })
})

module.exports = PublicRoute