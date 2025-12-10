import express from "express";
import axios from "axios";

const app = express();
app.use(express.json());

const CLIENT_ID = process.env.SPLITWISE_CLIENT_ID;
const CLIENT_SECRET = process.env.SPLITWISE_CLIENT_SECRET;
const REDIRECT_URI = process.env.SPLITWISE_REDIRECT_URI;

// Store tokens in memory for now (later → DB)
let accessToken = null;
let refreshToken = null;

// 1️⃣ Splitwise redirects here with ?code=
app.get("/splitwise/callback", async (req, res) => {
    const code = req.query.code;

    try {
        // 2️⃣ Exchange code for tokens
        const response = await axios.post(
            "https://secure.splitwise.com/oauth/token",
            new URLSearchParams({
                grant_type: "authorization_code",
                code,
                client_id: CLIENT_ID,
                client_secret: CLIENT_SECRET,
                redirect_uri: REDIRECT_URI
            })
        );

        accessToken = response.data.access_token;
        refreshToken = response.data.refresh_token;

        console.log("Access Token Saved!");

        // Redirect back to your iOS app
        res.send("Success! Your Splitwise account is linked. You can close this page.");
    } catch (err) {
        console.error(err.response?.data || err.message);
        res.status(500).send("OAuth Error");
    }
});

// 3️⃣ API endpoint for your iOS app
app.get("/api/expenses", async (req, res) => {
    if (!accessToken) return res.status(401).json({ error: "Not authenticated with Splitwise" });

    try {
        const response = await axios.get(
            "https://secure.splitwise.com/api/v3.0/get_expenses",
            {
                headers: {
                    Authorization: `Bearer ${accessToken}`
                }
            }
        );

        res.json(response.data);
    } catch (err) {
        console.error(err.response?.data || err.message);
        res.status(500).send("Failed fetching expenses");
    }
});

// 4️⃣ Start server
app.listen(3000, () => {
    console.log("Server running on port 3000");
});
