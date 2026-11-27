const express = require('express')
const AuthRoute = express.Router()

const AuthController = require('../controllers/Auth.controller')
const authenticate = require('../middleware/auth.middleware')
const multer = require('multer')
const upload = multer({
    storage: multer.memoryStorage(),
    limits: { files: 1, fileSize: 5 * 1024 * 1024 },
    fileFilter: (req, file, callback) => {
        if (!file.mimetype.startsWith('image/')) {
            return callback(new Error('Only image files are supported'));
        }
        return callback(null, true);
    }
})
const handleImageUploadError = (error, req, res, next) => {
    if (!error) return next();

    const status = error.code === 'LIMIT_FILE_SIZE' ? 413 : 400;
    return res.status(status).json({ message: error.message });
}

AuthRoute.post('/register', AuthController.UserRegister)
AuthRoute.post('/login', AuthController.UserLogin)
AuthRoute.post('/logout', AuthController.Logout)
AuthRoute.get('/getme', authenticate, AuthController.GetMe)
AuthRoute.patch('/profile', authenticate, AuthController.UpdateProfileDetails)
AuthRoute.patch('/profile/privacy', authenticate, AuthController.UpdateProfilePrivacy)
AuthRoute.put(
    '/profile/image',
    authenticate,
    upload.single('image'),
    handleImageUploadError,
    AuthController.UpdateProfileImage
)
AuthRoute.put(
    '/profile/banner',
    authenticate,
    upload.single('image'),
    handleImageUploadError,
    AuthController.UpdateProfileBanner
)

module.exports = AuthRoute