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

    console.log("Callback hit with code:", code);
    console.log("CLIENT_ID:", CLIENT_ID);
    console.log("CLIENT_SECRET present:", CLIENT_SECRET ? "YES" : "NO");
    console.log("REDIRECT_URI:", REDIRECT_URI);

    if (!code) {
        return res.status(400).send("No code received.");
    }

    try {
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

        console.log("✔ Splitwise tokens saved!", tokenResponse.data);

        return res.send("✔ Successfully connected to Splitwise! You may close this window.");
    } catch (error) {
        console.error("OAuth Error status:", error.response?.status);
        console.error("OAuth Error data:", error.response?.data);
        return res.status(500).send("OAuth error.");
    }
});

// 4️⃣ Get current Splitwise user
app.get("/api/me", async (req, res) => {
    if (!accessToken)
        return res.status(401).json({ error: "Not authenticated" });

    try {
        const response = await axios.get(
            "https://secure.splitwise.com/api/v3.0/get_current_user",
            {
                headers: { Authorization: `Bearer ${accessToken}` }
            }
        );

        console.log("Fetched current user:", response.data);
        return res.json(response.data);
    } catch (err) {
        console.error("Get user error:", err.response?.data || err);
        res.status(500).json({ error: "Failed to fetch user" });
    }
});

// 3️⃣ API endpoint to get expenses (with date filter)
app.get("/api/expenses", async (req, res) => {
    if (!accessToken) return res.status(401).json({ error: "Not authenticated" });

    const since = req.query.since;

    try {
        const response = await axios.get(
            `https://secure.splitwise.com/api/v3.0/get_expenses?dated_after=${since}`,
            {
                headers: { Authorization: `Bearer ${accessToken}` }
            }
        );

        console.log("Expenses returned:", response.data.expenses.length);
        console.log(JSON.stringify(response.data.expenses, null, 2));

        return res.json(response.data);
    } catch (err) {
        console.error(err.response?.data || err.message);
        return res.status(500).send("Failed to fetch expenses");
    }
});


// Root route to prevent 404 on backend root
app.get("/", (req, res) => {
    res.send("Splitwise Backend is running!");
});

// Health check route for uptime monitors
app.get("/health", (req, res) => {
    res.json({
        status: "ok",
        uptime: process.uptime(),
        timestamp: new Date().toISOString()
    });
});




// 4️⃣ Start server on Render's port
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
    console.log(`Backend running on port ${PORT}`);
});
