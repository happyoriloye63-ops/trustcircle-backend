const express = require("express");
const pool = require("../config/postgres");
const authenticateToken = require("../middleware/authMiddleware");

const router = express.Router();


// =========================================================
// CREATE PAYMENT / ORDER
// =========================================================

router.post(
    "/create",
    authenticateToken,
    async (req, res) => {

        try {

            // =================================================
            // GET PAYMENT INFORMATION
            // =================================================

            const {
                productId,
                productName,
                amount,
                paymentMethod,
                walletAddress
            } = req.body;


            // =================================================
            // CHECK REQUIRED FIELDS
            // =================================================

            if (
                !productId ||
                !productName ||
                amount === undefined ||
                !paymentMethod
            ) {
                return res.status(400).json({
                    message:
                        "Missing payment information"
                });
            }


            // =================================================
            // CHECK AMOUNT
            // =================================================

            if (
                typeof amount !== "number" ||
                amount <= 0
            ) {
                return res.status(400).json({
                    message:
                        "Invalid payment amount"
                });
            }


            // =================================================
            // ALLOWED PAYMENT METHODS
            // =================================================

            const allowedMethods = [
                "wallet",
                "card",
                "none"
            ];


            if (
                !allowedMethods.includes(
                    paymentMethod
                )
            ) {
                return res.status(400).json({
                    message:
                        "Invalid payment method"
                });
            }


            // =================================================
            // WALLET PAYMENT
            // =================================================

            if (
                paymentMethod === "wallet" &&
                !walletAddress
            ) {
                return res.status(400).json({
                    message:
                        "Please connect a wallet first"
                });
            }


            // =================================================
            // PAYMENT STATUS
            // =================================================

            const paymentStatus =
                paymentMethod === "none"
                    ? "not_required"
                    : "paid";


            // =================================================
            // ORDER STATUS
            // =================================================

            const orderStatus =
                paymentMethod === "none"
                    ? "awaiting_shipment"
                    : "escrow_funded";


            // =================================================
            // CREATE ORDER IN POSTGRESQL
            // =================================================

            const result = await pool.query(
                `
                INSERT INTO orders (
                    user_id,
                    product_id,
                    product_name,
                    amount,
                    payment_method,
                    payment_status,
                    status,
                    wallet_address
                )
                VALUES (
                    $1,
                    $2,
                    $3,
                    $4,
                    $5,
                    $6,
                    $7,
                    $8
                )
                RETURNING *
                `,
                [
                    req.user.id,
                    productId,
                    productName,
                    amount,
                    paymentMethod,
                    paymentStatus,
                    orderStatus,
                    walletAddress || null
                ]
            );


            // =================================================
            // SUCCESS
            // =================================================

            res.status(201).json({
                message:
                    "Order created successfully",

                order:
                    result.rows[0]
            });

        } catch (error) {

            console.error(
                "Payment error:",
                error.message
            );

            res.status(500).json({
                message:
                    "Server error while processing payment"
            });
        }
    }
);


module.exports = router;
