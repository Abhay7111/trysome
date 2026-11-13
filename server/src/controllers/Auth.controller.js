const userModel = require('../models/user.model');
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');

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
    {expiresIn: "1d"})

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

    const token = jwt.sign({
        id: User._id,
        username: User.username
    },
    process.env.JWT_SCRET,
    {expiresIn:"1d"})

    res.cookie("token", token)

    res.status(200).json({
        message: "successfully loggedin",
        user: User.username
    })


}

async function GetMe(req,res) {
    const userId = req.user.id
    const user = await userModel.findById(userId)

    if (!user) {
            return res.status(404).json({ error: "User not found" });
        }

    res.status(200).json({
        message: `get me data fetched successfully`,
        username: user.username,
        email: user.email,
        profile_img: user.profile_img
    })
}

module.exports = {
    UserRegister,
    UserLogin,
    GetMe
}