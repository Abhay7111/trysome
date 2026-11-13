const mongoose = require('mongoose');

const userSchema = new mongoose.Schema({
    username:{
        type: String,
        required: [true,"username is required"],
        unique: [true, "username is already exist"]
    },
    password:{
        type: String,
        required: [true, "password is required"]
    },
    email:{
        type: String,
        required: [true, "email is required"],
        unique: [true, "email already exist"]
    },
    profile_img:{
        type: String,
        default: "https://cdn.pixabay.com/photo/2015/10/05/22/37/blank-profile-picture-973460_1280.png"
    }
})
const userModel = mongoose.model('user', userSchema)

module.exports = userModel