const jwt = require('jsonwebtoken');

function authenticate(req, res, next) {
    const token = req.cookies?.token;
    if (!token) {
        return res.status(401).json({ error: "Unauthorized" });
    }

    try {
        const user = jwt.verify(token, process.env.JWT_SCRET);
        if (!user || typeof user !== "object" || !user.id) {
            return res.status(401).json({ error: "Unauthorized" });
        }

        req.user = user;
        return next();
    } catch (err) {
        if (err instanceof jwt.JsonWebTokenError) {
            return res.status(401).json({ error: "Unauthorized" });
        }
        return next(err);
    }
}

module.exports = authenticate;
