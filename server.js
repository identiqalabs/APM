import express from "express";
import session from "express-session";
import mongoose from "mongoose";
import path from "path";
import fs from "fs";
import dotenv from "dotenv";
import { fileURLToPath } from "url";

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Config
const PORT = process.env.PORT || 3000;
const MONGODB_URI =
  process.env.MONGODB_URI ||
  "mongodb+srv://zabbix:OTMAyONPjXrPP8q4@nms1.3vmrs1q.mongodb.net/?appName=NMS1";
const SESSION_SECRET = process.env.SESSION_SECRET || "123456";
const ADMIN_USERNAME = process.env.ADMIN_USERNAME || "admin";
const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD || "admin123";

// MongoDB Connection
let isConnected = false;
async function connectToDB() {
  if (isConnected) return;
  try {
    await mongoose.connect(MONGODB_URI, { dbName: "widget_app" });
    isConnected = true;
    console.log("✅ MongoDB connected");
  } catch (err) {
    console.error("MongoDB connection failed:", err);
    throw err;
  }
}

// Lambda-friendly static HTML
const appHtml = fs.readFileSync(path.join(__dirname, "public", "app.html"), "utf8");
const indexHtml = fs.readFileSync(path.join(__dirname, "public", "index.html"), "utf8");

// Connect to DB before starting app
await connectToDB();

// Models
const widgetSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true },
    url: { type: String, required: true, trim: true },
    description: { type: String, trim: true, default: "" },
  },
  { timestamps: true }
);
const Widget = mongoose.model("Widget", widgetSchema);

// Express App
const app = express();

// Disable caching globally
app.use((req, res, next) => {
  res.setHeader("Cache-Control", "no-store, no-cache, must-revalidate, max-age=0, private");
  res.setHeader("Pragma", "no-cache");
  res.setHeader("Expires", "0");
  res.setHeader("Surrogate-Control", "no-store");
  next();
});

// JSON + Session middleware
app.use(express.json());
app.use(
  session({
    secret: SESSION_SECRET,
    resave: false,
    saveUninitialized: false,
    cookie: { httpOnly: true, sameSite: "strict", secure: false, maxAge: 1000 * 60 * 60 * 8 },
  })
);

// Auth Middleware
function requireAuth(req, res, next) {
  if (req.session && req.session.authenticated) return next();
  return res.status(401).json({ error: "Unauthorized" });
}

// --- Routes ---

// Minimal Lambda test route
app.get("/APMWidgetApp", (req, res) => {
  console.log("Serving /APMWidgetApp route");
  res.setHeader("Content-Type", "text/html");
  res.send(appHtml);
});

// Login/Logout/Auth-check
app.post("/api/login", (req, res) => {
  const { username, password } = req.body || {};
  if (username === ADMIN_USERNAME && password === ADMIN_PASSWORD) {
    req.session.authenticated = true;
    return res.json({ ok: true });
  }
  return res.status(401).json({ error: "Invalid credentials" });
});
app.post("/api/logout", (req, res) => {
  req.session.destroy(() => {
    res.clearCookie("connect.sid");
    res.json({ ok: true });
  });
});
app.get("/api/auth-check", requireAuth, (req, res) => res.json({ ok: true }));
app.head("/api/auth-check", requireAuth, (req, res) => res.status(200).end());

// Widgets
app.get("/api/widgets", requireAuth, async (req, res) => {
  const widgetsRaw = await Widget.find().sort({ createdAt: -1 }).lean();
  const widgets = widgetsRaw.map((w) => ({ ...w, _id: w._id?.toString?.() || String(w._id) }));
  res.json({ widgets });
});
app.post("/api/widgets", requireAuth, async (req, res) => {
  const { name, url, description } = req.body || {};
  if (!name || !url) return res.status(400).json({ error: "Both name and url are required" });
  try {
    const widget = await Widget.create({ name: name.trim(), url: url.trim(), description: description?.trim() || "" });
    res.status(201).json({ widget });
  } catch {
    res.status(400).json({ error: "Failed to create widget" });
  }
});
app.delete("/api/widgets/:id", requireAuth, async (req, res) => {
  const { id } = req.params;
  if (!mongoose.isValidObjectId(id)) return res.status(400).json({ error: "Invalid widget id" });
  const result = await Widget.findByIdAndDelete(id);
  if (!result) return res.status(404).json({ error: "Not found" });
  res.json({ ok: true });
});

// Serve UI pages
app.get("/app.html", (req, res) => {
  if (!req.session || !req.session.authenticated) return res.send(indexHtml);
  res.setHeader("Content-Type", "text/html");
  res.send(appHtml);
});
app.get("/", (req, res) => res.send(indexHtml));

// Start server locally
if (!process.env.AWS_LAMBDA_FUNCTION_NAME) {
  app.listen(PORT, () => console.log(`✅ Server listening on http://localhost:${PORT}`));
}

export default app;
