const userModel = require('../models/user.model');
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const uploadImage = require('../services/imagekit.service');

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
            id: String(user._id),
            username: user.username,
            email: user.email,
            profile_img: user.profile_img,
            banner_img: user.banner_img,
            bio: user.bio,
            isPrivate: user.isPrivate
        });
    } catch (err) {
        return res.status(500).json({
            message: "Internal server error"
        });
    }
}

async function UpdateProfileDetails(req, res) {
    const username = typeof req.body?.username === 'string'
        ? req.body.username.trim()
        : '';
    const bio = typeof req.body?.bio === 'string' ? req.body.bio.trim() : '';

    if (!username || username.length > 30) {
        return res.status(400).json({
            message: 'Username must be between 1 and 30 characters'
        });
    }
    if (bio.length > 160) {
        return res.status(400).json({ message: 'Bio must be 160 characters or fewer' });
    }

    try {
        const existingUser = await userModel.findOne({
            username,
            _id: { $ne: req.user.id }
        }).select('_id');
        if (existingUser) {
            return res.status(409).json({ message: 'Username is already taken' });
        }

        const user = await userModel.findByIdAndUpdate(
            req.user.id,
            { $set: { username, bio } },
            { new: true, runValidators: true }
        ).select('username bio');
        if (!user) {
            return res.status(404).json({ message: 'User not found' });
        }

        return res.status(200).json({
            message: 'Profile updated',
            username: user.username,
            bio: user.bio
        });
    } catch (error) {
        if (error.code === 11000) {
            return res.status(409).json({ message: 'Username is already taken' });
        }
        return res.status(500).json({ message: 'Unable to update profile' });
    }
}

async function UpdateProfilePrivacy(req, res) {
    const { isPrivate } = req.body ?? {};
    if (typeof isPrivate !== 'boolean') {
        return res.status(400).json({ message: "isPrivate must be a boolean" });
    }

    try {
        const user = await userModel.findByIdAndUpdate(
            req.user.id,
            { isPrivate },
            { new: true }
        ).select('isPrivate');

        if (!user) {
            return res.status(404).json({ message: "User not found" });
        }

        return res.status(200).json({
            message: "Profile privacy updated",
            isPrivate: user.isPrivate
        });
    } catch (err) {
        return res.status(500).json({
            message: "Unable to update profile privacy"
        });
    }
}

function Logout(req, res) {
    res.clearCookie('token');
    return res.status(200).json({ message: "Logged out successfully" });
}

async function UpdateProfileImage(req, res) {
    if (!req.file) {
        return res.status(400).json({ message: "Profile image is required" });
    }

    try {
        const profile_img = await uploadImage(
            req.file.buffer,
            req.file.originalname,
            'Tweet-clone/profiles'
        );
        const user = await userModel.findByIdAndUpdate(
            req.user.id,
            { profile_img },
            { new: true }
        ).select('username email profile_img');

        if (!user) {
            return res.status(404).json({ message: "User not found" });
        }

        return res.status(200).json({
            message: "Profile picture updated",
            profile_img: user.profile_img
        });
    } catch (err) {
        return res.status(500).json({
            message: "Unable to update profile picture"
        });
    }
}

async function UpdateProfileBanner(req, res) {
    if (!req.file) {
        return res.status(400).json({ message: 'Banner image is required' });
    }

    try {
        const banner_img = await uploadImage(
            req.file.buffer,
            req.file.originalname,
            'Tweet-clone/banners'
        );
        const user = await userModel.findByIdAndUpdate(
            req.user.id,
            { banner_img },
            { new: true }
        ).select('banner_img');

        if (!user) {
            return res.status(404).json({ message: 'User not found' });
        }

        return res.status(200).json({
            message: 'Profile banner updated',
            banner_img: user.banner_img
        });
    } catch (error) {
        return res.status(500).json({ message: 'Unable to update profile banner' });
    }
}

module.exports = {
    UserRegister,
    UserLogin,
    GetMe,
    UpdateProfileDetails,
    UpdateProfileImage,
    UpdateProfileBanner,
    UpdateProfilePrivacy,
    Logout
}