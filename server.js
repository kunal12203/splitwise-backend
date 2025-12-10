import express from "express";
import axios from "axios";

const app = express();
app.use(express.json());

// Read from Render Environment Variables
const CLIENT_ID = process.env.SPLITWISE_CLIENT_ID;
const CLIENT_SECRET = process.env.SPLITWISE_CLIENT_SECRET;
const REDIRECT_URI = process.env.SPLITWISE_REDIRECT_URI;

// Temporary in-memory token storage
let accessToken = null;
let refreshToken = null;

// 1️⃣ OAuth Redirect Handler
app.get("/splitwise/callback", async (req, res) => {
    const code = req.query.code;

    if (!code) {
        return res.status(400).send("No code received.");
    }

    try {
        // 2️⃣ Exchange code for tokens
        const tokenResponse = await axios.post(
            "https://secure.splitwise.com/oauth/token",
            new URLSearchParams({
                grant_type: "authorization_code",
                code,
                client_id: CLIENT_ID,
                client_secret: CLIENT_SECRET,
                redirect_uri: REDIRECT_URI
            }),
            {
                headers: {
                    "Content-Type": "application/x-www-form-urlencoded"
                }
            }
        );

        accessToken = tokenResponse.data.access_token;
        refreshToken = tokenResponse.data.refresh_token;

        console.log("✔ Splitwise tokens saved!");

        return res.send("✔ Successfully connected to Splitwise! You may close this window.");
    } catch (error) {
        console.error("OAuth Error:", error.response?.data || error.message);
        return res.status(500).send("OAuth error.");
    }
});

// 3️⃣ API endpoint to get expenses (for your iOS app)
app.get("/api/expenses", async (req, res) => {
    if (!accessToken) {
        return res.status(401).json({ error: "Not authenticated with Splitwise." });
    }

    try {
        const response = await axios.get(
            "https://secure.splitwise.com/api/v3.0/get_expenses",
            {
                headers: {
                    Authorization: `Bearer ${accessToken}`
                }
            }
        );

        return res.json(response.data);
    } catch (error) {
        console.error("Expense Fetch Error:", error.response?.data || error.message);
        return res.status(500).send("Failed to fetch expenses.");
    }
});

// 4️⃣ Start server on Render's port
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
    console.log(`Backend running on port ${PORT}`);
});
