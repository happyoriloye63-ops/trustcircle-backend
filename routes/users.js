const express = require("express");
const pool = require("../config/postgres");
const authenticateToken = require("../middleware/authMiddleware");

const router = express.Router();

router.post("/wallet", authenticateToken, async (req, res) => {
    try {
        const { wallet_address } = req.body;

        if (!wallet_address) {
            return res.status(400).json({
                message: "Wallet address is required"
            });
        }

        const walletExists = await pool.query(
            "SELECT id FROM users WHERE wallet_address = $1",
            [wallet_address]
        );

        if (walletExists.rows.length > 0) {
            return res.status(409).json({
                message: "Wallet address is already linked"
            });
        }

        const result = await pool.query(
            `UPDATE users
             SET wallet_address = $1
             WHERE id = $2
             RETURNING id, email, wallet_address, role`,
            [wallet_address, req.user.id]
        );

        if (result.rows.length === 0) {
            return res.status(404).json({
                message: "User not found"
            });
        }

        res.json({
            message: "Wallet linked successfully",
            user: result.rows[0]
        });

    } catch (error) {
        console.error("Wallet linking error:", error.message);

        res.status(500).json({
            message: "Server error"
        });
    }
});

module.exports = router;