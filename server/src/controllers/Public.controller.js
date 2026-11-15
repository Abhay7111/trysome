const userModel = require('../models/user.model');

async function publicController(req, res) {
    const users = await userModel.find()
        .select('username profile_img');

    return res.status(200).json({
        message: "user fetched successfully",
        users
    })
}

module.exports = {
    publicController
}