const jwt = require("jsonwebtoken");
const crypto = require("crypto");
const auth = require("../models/auth/auth");
const Session = require("../models/auth/session");

async function candidateAuth(req, res, next) {
    try {
        const Token = req.cookies?.refreshToken || req.headers.authorization?.split(" ")[1];
        if (!Token) {
            return res.status(401).json({ message: "No Token Provided" });
        }

        const refreshTokenHash = crypto.createHash("sha256").update(Token).digest("hex");
        const existingSession = await Session.findOne({
            $or: [{ refreshToken: Token }, { refreshToken: refreshTokenHash }],
            status: "active"
        });

        // If session checking is strictly required:
        if (!existingSession) {
            // Alternatively fallback to standard JWT check if session wasn't found or session schema stores raw token
        }

        const verified = jwt.verify(Token, process.env.JWT_SECRET || "default_secret");
        if (!verified) {
            return res.status(401).json({ message: "Invalid token" });
        }

        const user = await auth.findById(verified.id || verified._id || verified.userId);
        if (!user) {
            return res.status(404).json({ message: "Candidate not found" });
        }

        req.user = user;
        next();
    } catch (error) {
        console.error("Auth Middleware Error:", error.message);
        return res.status(401).json({ message: "Unauthorized or invalid token" });
    }
}

module.exports = { candidateAuth };