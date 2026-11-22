const userModel = require('../models/user.model');
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');

const expireTime = `${2}Day`

async function UserRegister(req, res) {
    const {username, password, email, profile_img} = req.body;

    const User = await userModel.findOne({
        $or:[
            {username},
            {email}
        ]
    })

    if(User){
        return res.status(409).json({
            message: "User already exist with " + (User.username == username ? "username" : "email")
        })
    }

    const hash = await bcrypt.hash(password, 12)

    
    const createUser = await userModel.create({
        username,
        password: hash,
        email,
        profile_img
    })

    const token = jwt.sign({
        id: createUser._id,
        username: createUser.username
    },
    process.env.JWT_SCRET,
    {expiresIn: expireTime})

    res.cookie("token", token)

    res.status(201).json({
        message: "user register successfully",
        user: username, email
    })
}

async function UserLogin(req, res) {
    const {username, email, password} = req.body

    const User = await userModel.findOne({
        $or:[
            {username},
            {email}
        ]
    }).select("+password")

    if(!User) {
        return res.status(404).json({
            message: "User not found"
        })
    }

    const isPasswordValid = await bcrypt.compare(password, User.password)

    if(!isPasswordValid) {
        return res.status(401).json({
            message: "password is incorrect"
        })
    }

    const token = jwt.sign({
        id: User._id,
        username: User.username
    },
    process.env.JWT_SCRET,
    {expiresIn: expireTime})

    res.cookie("token", token)

    res.status(200).json({
        message: "successfully loggedin",
        user: User.username
    })


}

async function GetMe(req, res) {
    const userId = req.user?.id;
    try {
        if (!userId) {
            return res.status(401).json({ error: "Unauthorized" });
        }

        const user = await userModel.findById(userId);
        if (!user) {
            return res.status(404).json({ error: "User not found" });
        }

        return res.status(200).json({
            message: "get me data fetched successfully",
            username: user.username,
            email: user.email,
            profile_img: user.profile_img
        });
    } catch (err) {
        return res.status(500).json({
            message: "Internal server error"
        });
    }
}

module.exports = {
    UserRegister,
    UserLogin,
    GetMe
}