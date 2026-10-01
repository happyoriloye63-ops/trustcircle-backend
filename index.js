const express = require("express");
const cors = require("cors");
require("dotenv").config();

const pool = require("./config/postgres");

const authRoutes = require("./routes/auth");
const userRoutes = require("./routes/users");
const paymentRoutes = require("./routes/paymentRoutes");

const app = express();

const PORT = process.env.PORT || 5000;

// =========================
// MIDDLEWARE
// =========================

app.use(cors());
app.use(express.json());

// =========================
// ROUTES
// =========================

app.use("/auth", authRoutes);

app.use("/users", userRoutes);

app.use("/payments", paymentRoutes);

// =========================
// HOME ROUTE
// =========================

app.get("/", (req, res) => {
res.json({
message: "TrustCircle API is running!"
});
});

// =========================
// TEST DATABASE CONNECTION
// =========================

pool.query("SELECT NOW()")
.then((result) => {
console.log("PostgreSQL connected!");


    console.log(
        "Database time:",
        result.rows[0]
    );
})
.catch((error) => {
    console.error(
        "PostgreSQL connection error:",
        error.message
    );
});


app.get("/db-test", async (req, res) => {
  try {
    const result = await pool.query("SELECT NOW()");

    res.json({
      connected: true,
      databaseTime: result.rows[0].now
    });
  } catch (error) {
    console.error("Database test error:", error.message);

    res.status(500).json({
      connected: false,
      error: error.message
    });
  }
});

// =========================
// START SERVER
// =========================

app.listen(PORT, () => {
console.log(
`TrustCircle server running on port ${PORT}`
);
});
