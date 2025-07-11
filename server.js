import express from "express";
import dotenv from "dotenv";
import cors from "cors";
import mongoose from "mongoose";
import bcrypt from "bcryptjs";
import connectDB from "./config/db.js";
import formRoutes from "./routes/formRoutes.js";
import cloudinary from "./config/cloudinary.js";
import User from "./models/User.js";
import session from "express-session";
import MongoStore from "connect-mongo";

// Load environment variables
dotenv.config();

// Initialize app
const app = express();

// Connect to MongoDB
connectDB()
  .then(() => console.log("MongoDB connected"))
  .catch((err) => console.error("MongoDB connection error:", err));

// Cloudinary config
cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});

// CORS config
app.use(
  cors({
    origin: "http://localhost:5173", // Match Vite dev server
    methods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
    credentials: true,
    exposedHeaders: ["Set-Cookie", "Authorization"],
  })
);

// Middleware for JSON and URL-encoded data
app.use(express.json({ limit: "20mb" }));
app.use(express.urlencoded({ extended: true, limit: "20mb" }));

// Session middleware
app.use(
  session({
    secret: process.env.SESSION_SECRET || "your-secret-key",
    resave: false,
    saveUninitialized: false,
    store: MongoStore.create({ mongoUrl: process.env.MONGO_URI }),
    cookie: {
      maxAge: 1000 * 60 * 60, // 1 hour
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
    },
  })
);
console.log("Session store initialized:", MongoStore.create({ mongoUrl: process.env.MONGO_URI }));

// Authentication middleware with enhanced debugging
const authenticateToken = (req, res, next) => {
  console.log("Auth Middleware - Session Check:", {
    sessionExists: !!req.session,
    user: req.session?.user,
    isAuthenticated: req.session?.isAuthenticated,
    cookie: req.headers.cookie,
  });
  if (!req.session || !req.session.user || !req.session.isAuthenticated) {
    return res.status(401).json({ message: "Access denied, no valid session" });
  }
  req.user = req.session.user;
  next();
};

// Add role-based middleware
const authorizeRole = (role) => (req, res, next) => {
  console.log("Role Check - User Role:", req.session.user.role, "Required Role:", role);
  if (req.session.user.role !== role) {
    return res.status(403).json({ message: "Access denied, insufficient permissions" });
  }
  next();
};

// Initial admin setup route (run once to create an admin user)
app.post("/api/auth/setup-admin", async (req, res) => {
  try {
    const { mobile, password, name, branch } = req.body;
    if (!mobile || !password || !name || !branch) {
      return res.status(400).json({ message: "All fields (mobile, password, name, branch) are required" });
    }

    const existingAdmin = await User.findOne({ role: "admin" });
    if (existingAdmin) {
      return res.status(400).json({ message: "Admin already exists" });
    }

    const hashedPassword = await bcrypt.hash(password, 10);
    const adminUser = new User({ mobile, password: hashedPassword, name, branch, role: "admin" });
    await adminUser.save();

    res.status(201).json({ message: "Admin user created successfully", user: { id: adminUser._id, mobile, name, branch, role: "admin" } });
  } catch (error) {
    console.error("Error setting up admin:", error.message, error.stack);
    res.status(500).json({ message: "Error creating admin user", error: error.message });
  }
});

// Auth routes
app.post("/api/auth/register", async (req, res) => {
  const { mobile, password, name, branch } = req.body;
  try {
    const existingUser = await User.findOne({ mobile });
    if (existingUser) return res.status(400).json({ message: "User already exists" });

    const hashedPassword = await bcrypt.hash(password, 10);
    const user = new User({ mobile, password: hashedPassword, name, branch });
    await user.save();

    req.session.user = { id: user._id, mobile, name, branch, role: user.role };
    req.session.isAuthenticated = true;

    res.status(201).json({ message: "User registered successfully", user: req.session.user });
  } catch (error) {
    res.status(500).json({ message: "Error registering user", error: error.message });
  }
});

app.post("/api/auth/login", async (req, res) => {
  const { mobile, password } = req.body;
  try {
    const user = await User.findOne({ mobile });
    if (!user || !await bcrypt.compare(password, user.password)) {
      return res.status(400).json({ message: "Invalid mobile number or password" });
    }

    req.session.user = { id: user._id, mobile: user.mobile, name: user.name, branch: user.branch, role: user.role };
    req.session.isAuthenticated = true;
    console.log("Login Successful - Session User:", req.session.user);

    res.json({ message: "Login successful", user: req.session.user });
  } catch (error) {
    res.status(500).json({ message: "Error logging in", error: error.message });
  }
});

app.post("/api/auth/admin/add-user", authenticateToken, authorizeRole("admin"), async (req, res) => {
  const { mobile, password, name, branch, role } = req.body;
  try {
    const existingUser = await User.findOne({ mobile });
    if (existingUser) return res.status(400).json({ message: "User already exists" });

    const hashedPassword = await bcrypt.hash(password, 10);
    const user = new User({ mobile, password: hashedPassword, name, branch, role: role || "user" });
    await user.save();

    req.session.user = { id: user._id, mobile, name, branch, role: user.role };
    req.session.isAuthenticated = true;

    res.status(201).json({ message: "User added successfully", user: req.session.user });
  } catch (error) {
    res.status(500).json({ message: "Error adding user", error: error.message });
  }
});

app.post("/api/auth/send-otp", async (req, res) => {
  const { mobile } = req.body;
  try {
    const user = await User.findOne({ mobile });
    if (!user) return res.status(400).json({ message: "User not found" });

    const otp = Math.floor(100000 + Math.random() * 900000).toString();
    req.session.otp = { mobile, code: otp, expires: Date.now() + 5 * 60 * 1000 };

    console.log(`OTP for ${mobile}: ${otp}`);
    res.json({ message: "OTP sent" });
  } catch (error) {
    res.status(500).json({ message: "Error sending OTP", error: error.message });
  }
});

app.post("/api/auth/verify-otp", async (req, res) => {
  const { mobile, otp } = req.body;
  const otpData = req.session.otp;
  if (!otpData || otpData.mobile !== mobile || otpData.code !== otp || Date.now() > otpData.expires) {
    return res.status(400).json({ message: "Invalid or expired OTP" });
  }

  req.session.otp = null;
  res.json({ message: "OTP verified successfully" });
});

app.post("/api/auth/reset-password", async (req, res) => {
  const { mobile, newPassword } = req.body;
  try {
    const user = await User.findOne({ mobile });
    if (!user) return res.status(400).json({ message: "User not found" });

    user.password = await bcrypt.hash(newPassword, 10);
    await user.save();

    res.json({ message: "Password reset successful" });
  } catch (error) {
    res.status(500).json({ message: "Error resetting password", error: error.message });
  }
});

app.post("/api/auth/logout", (req, res) => {
  req.session.destroy((err) => {
    if (err) return res.status(500).json({ message: "Error logging out", error: err.message });
    res.json({ message: "Logged out successfully" });
  });
});

app.get("/api/auth/session", async (req, res) => {
  console.log("Session Check Response:", {
    sessionExists: !!req.session,
    user: req.session?.user,
    isAuthenticated: req.session?.isAuthenticated,
  });
  if (req.session) {
    if (req.session.user && req.session.isAuthenticated) {
      return res.json({ isAuthenticated: true, user: req.session.user });
    }
    if (req.session.userId) {
      try {
        const user = await User.findById(req.session.userId);
        if (user) {
          req.session.user = { id: user._id, mobile: user.mobile, name: user.name, branch: user.branch, role: user.role };
          req.session.isAuthenticated = true;
          return res.json({ isAuthenticated: true, user: req.session.user });
        }
      } catch (error) {
        console.error("Error fetching user from session:", error);
      }
    }
    res.json({ isAuthenticated: false });
  } else {
    res.json({ isAuthenticated: false });
  }
});

app.use("/api/form", authenticateToken, formRoutes);

// Server start
const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
  console.log(`Server started on port ${PORT} at ${new Date().toLocaleString("en-IN", { timeZone: "Asia/Kolkata" })}`);
});