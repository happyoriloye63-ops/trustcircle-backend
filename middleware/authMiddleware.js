
const jwt = require("jsonwebtoken");

const authenticateToken = (req, res, next) => {
    try {
        // =========================================
        // 1. GET AUTHORIZATION HEADER
        // =========================================

        const authHeader = req.headers.authorization;

        // Check if Authorization header exists
        if (!authHeader) {
            return res.status(401).json({
                message: "Access denied. No token provided."
            });
        }

        // =========================================
        // 2. CHECK BEARER FORMAT
        // =========================================

        // Expected:
        // Authorization: Bearer YOUR_TOKEN

        if (!authHeader.startsWith("Bearer ")) {
            return res.status(401).json({
                message: "Access denied. Invalid token format."
            });
        }

        // =========================================
        // 3. GET THE TOKEN
        // =========================================

        const token = authHeader.split(" ")[1];

        if (!token) {
            return res.status(401).json({
                message: "Access denied. No token provided."
            });
        }

        // =========================================
        // 4. CHECK JWT SECRET
        // =========================================

        if (!process.env.JWT_SECRET) {
            console.error(
                "JWT_SECRET is missing from .env"
            );

            return res.status(500).json({
                message: "Server configuration error"
            });
        }

        // =========================================
        // 5. VERIFY TOKEN
        // =========================================

        const decoded = jwt.verify(
            token,
            process.env.JWT_SECRET
        );

        // =========================================
        // 6. SAVE USER INFORMATION
        // =========================================

        req.user = decoded;

        // =========================================
        // 7. CONTINUE
        // =========================================

        next();

    } catch (error) {

        // Show the actual JWT problem
        // in the backend terminal
        console.error(
            "JWT error:",
            error.message
        );

        return res.status(401).json({
            message: "Invalid or expired token"
        });
    }
};

module.exports = authenticateToken;

