
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const pool = require("../config/postgres");


// =========================================================
// LOGIN RATE LIMIT
// =========================================================

const loginAttempts = new Map();

const MAX_LOGIN_ATTEMPTS = 3;

const LOCK_TIME = 30 * 1000; // 30 seconds


// =========================================================
// SIGNUP
// =========================================================

const signup = async (req, res) => {
    try {

        // Get information from React
        const {
            firstName,
            lastName,
            email,
            password
        } = req.body;


        // =====================================================
        // CHECK REQUIRED FIELDS
        // =====================================================

        if (
            !firstName ||
            !lastName ||
            !email ||
            !password
        ) {
            return res.status(400).json({
                message: "All fields are required"
            });
        }


        // =====================================================
        // NORMALIZE EMAIL
        // =====================================================

        const emailKey = email.toLowerCase().trim();


        // =====================================================
        // CHECK IF EMAIL ALREADY EXISTS
        // =====================================================

        const existingUser = await pool.query(
            "SELECT id FROM users WHERE email = $1",
            [emailKey]
        );

        if (existingUser.rows.length > 0) {
            return res.status(409).json({
                message: "Email already exists"
            });
        }


        // =====================================================
        // HASH PASSWORD
        // =====================================================

        const passwordHash = await bcrypt.hash(
            password,
            10
        );


        // =====================================================
        // CREATE USER
        // =====================================================

        const result = await pool.query(
            `INSERT INTO users
            (
                first_name,
                last_name,
                email,
                password_hash
            )
            VALUES ($1, $2, $3, $4)
            RETURNING
                id,
                first_name,
                last_name,
                email,
                wallet_address,
                role,
                created_at`,
            [
                firstName,
                lastName,
                emailKey,
                passwordHash
            ]
        );


        // =====================================================
        // SUCCESS
        // =====================================================

        res.status(201).json({
            message: "User created successfully",
            user: result.rows[0]
        });

    } catch (error) {

        console.error(
            "Signup error:",
            error.message
        );

        res.status(500).json({
            message: "Server error"
        });
    }
};



// =========================================================
// LOGIN
// =========================================================

const login = async (req, res) => {
    try {

        const {
            email,
            password
        } = req.body;


        // =====================================================
        // CHECK EMAIL AND PASSWORD
        // =====================================================

        if (!email || !password) {
            return res.status(400).json({
                message:
                    "Email and password are required"
            });
        }


        // =====================================================
        // NORMALIZE EMAIL
        // =====================================================

        const emailKey =
            email.toLowerCase().trim();


        // =====================================================
        // CHECK LOGIN ATTEMPTS
        // =====================================================

        const attemptInfo =
            loginAttempts.get(emailKey);


        if (attemptInfo) {

            // -----------------------------------------------
            // USER IS CURRENTLY LOCKED
            // -----------------------------------------------

            if (
                attemptInfo.lockedUntil >
                Date.now()
            ) {

                const secondsLeft =
                    Math.ceil(
                        (
                            attemptInfo.lockedUntil -
                            Date.now()
                        ) / 1000
                    );

                return res.status(429).json({
                    message:
                        `Too many incorrect passwords. Please try again in ${secondsLeft} seconds.`
                });
            }


            // -----------------------------------------------
            // LOCK HAS EXPIRED
            // -----------------------------------------------

            loginAttempts.delete(emailKey);
        }


        // =====================================================
        // FIND USER
        // =====================================================

        const result = await pool.query(
            "SELECT * FROM users WHERE email = $1",
            [emailKey]
        );


        // =====================================================
        // USER DOES NOT EXIST
        // =====================================================

        if (result.rows.length === 0) {
            return res.status(401).json({
                message:
                    "Invalid email or password"
            });
        }


        const user = result.rows[0];


        // =====================================================
        // CHECK PASSWORD
        // =====================================================

        const passwordMatch =
            await bcrypt.compare(
                password,
                user.password_hash
            );


        // =====================================================
        // WRONG PASSWORD
        // =====================================================

        if (!passwordMatch) {

            // Get previous attempts
            const current =
                loginAttempts.get(emailKey) || {
                    attempts: 0,
                    lockedUntil: 0
                };


            // Increase attempts by 1
            current.attempts += 1;


            // =================================================
            // 3 WRONG PASSWORDS
            // = 30 SECOND LOCK
            // =================================================

            if (
                current.attempts >=
                MAX_LOGIN_ATTEMPTS
            ) {

                current.lockedUntil =
                    Date.now() + LOCK_TIME;


                loginAttempts.set(
                    emailKey,
                    current
                );


                return res.status(429).json({
                    message:
                        "Too many incorrect passwords. Please try again in 30 seconds."
                });
            }


            // =================================================
            // SAVE ATTEMPTS
            // =================================================

            loginAttempts.set(
                emailKey,
                current
            );


            // Calculate remaining attempts
            const remaining =
                MAX_LOGIN_ATTEMPTS -
                current.attempts;


            return res.status(401).json({
                message:
                    `Incorrect password. ${remaining} attempt${remaining === 1 ? "" : "s"} remaining.`
            });
        }


        // =====================================================
        // CORRECT PASSWORD
        // RESET ATTEMPTS
        // =====================================================

        loginAttempts.delete(emailKey);


        // =====================================================
        // CHECK JWT SECRET
        // =====================================================

        if (!process.env.JWT_SECRET) {

            console.error(
                "JWT_SECRET is missing from .env"
            );

            return res.status(500).json({
                message:
                    "Server configuration error"
            });
        }


        // =====================================================
        // CREATE JWT TOKEN
        // =====================================================

        const token = jwt.sign(
            {
                id: user.id,
                email: user.email,
                role: user.role
            },
            process.env.JWT_SECRET,
            {
                expiresIn: "1d"
            }
        );


        // =====================================================
        // LOGIN SUCCESS
        // =====================================================

        res.status(200).json({

            message:
                "Login successful",

            token: token,

            user: {
                id: user.id,

                firstName:
                    user.first_name,

                lastName:
                    user.last_name,

                email:
                    user.email,

                walletAddress:
                    user.wallet_address,

                role:
                    user.role
            }
        });

    } catch (error) {

        console.error(
            "Login error:",
            error.message
        );

        res.status(500).json({
            message: "Server error"
        });
    }
};



// =========================================================
// EXPORT
// =========================================================

module.exports = {
    signup,
    login
};