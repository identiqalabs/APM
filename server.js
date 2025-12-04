import express from "express";
import mongoose from "mongoose";
import dotenv from "dotenv";
import jwt from "jsonwebtoken";
import path from "path";
import { fileURLToPath } from "url";

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
app.use(express.json());

// MongoDB connection (lazy, avoids top-level await)
let isConnected = false;
async function connectMongo() {
  if (isConnected) return;
  await mongoose.connect(process.env.MONGODB_URI, { dbName: "widget_app" });
  isConnected = true;
}

// Widget schema
const widgetSchema = new mongoose.Schema({
  name: { type: String, required: true, trim: true },
  url: { type: String, required: true, trim: true },
  description: { type: String, trim: true, default: "" }
}, { timestamps: true });

const Widget = mongoose.model("Widget", widgetSchema);

// JWT Middleware
function requireAuth(req, res, next) {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    return res.status(401).json({ error: "Unauthorized" });
  }
  const token = authHeader.split(" ")[1];
  try {
    jwt.verify(token, process.env.JWT_SECRET);
    next();
  } catch {
    return res.status(401).json({ error: "Unauthorized" });
  }
}

// Login
app.post("/api/login", async (req, res) => {
  const { username, password } = req.body || {};
  if (username === process.env.ADMIN_USERNAME && password === process.env.ADMIN_PASSWORD) {
    const token = jwt.sign({ username }, process.env.JWT_SECRET, { expiresIn: "8h" });
    return res.json({ token });
  }
  res.status(401).json({ error: "Invalid credentials" });
});

// Get widgets
app.get("/api/widgets", requireAuth, async (req, res) => {
  await connectMongo();
  const widgets = await Widget.find().sort({ createdAt: -1 }).lean();
  res.json({ widgets });
});

// Create widget
app.post("/api/widgets", requireAuth, async (req, res) => {
  await connectMongo();
  const { name, url, description } = req.body || {};
  if (!name || !url) return res.status(400).json({ error: "Name & URL required" });
  const widget = await Widget.create({ name: name.trim(), url: url.trim(), description: description?.trim() || "" });
  res.status(201).json({ widget });
});

// Delete widget
app.delete("/api/widgets/:id", requireAuth, async (req, res) => {
  await connectMongo();
  const { id } = req.params;
  if (!mongoose.isValidObjectId(id)) return res.status(400).json({ error: "Invalid ID" });
  const result = await Widget.findByIdAndDelete(id);
  if (!result) return res.status(404).json({ error: "Not found" });
  res.json({ ok: true });
});

// Serve frontend
app.use(express.static(path.join(__dirname, "public")));
app.get("/", (req, res) => res.sendFile(path.join(__dirname, "public", "index.html")));
app.get("/app.html", (req, res) => res.sendFile(path.join(__dirname, "public", "app.html")));

export default app;
