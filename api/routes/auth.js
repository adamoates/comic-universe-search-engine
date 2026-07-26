const express = require("express");
const prisma = require("../services/db");
const {
  hashPassword,
  comparePassword,
  generateToken,
} = require("../services/auth");
const { authenticate } = require("../middleware/auth");

module.exports = () => {
  const router = express.Router();

  // Register a new user
  router.post("/api/auth/register", async (req, res) => {
    try {
      const { email, password, displayName } = req.body;

      if (!email || !password || !displayName) {
        return res
          .status(400)
          .json({ error: "email, password, and displayName are required" });
      }

      const existing = await prisma.user.findUnique({ where: { email } });
      if (existing) {
        return res
          .status(409)
          .json({ error: "A user with this email already exists" });
      }

      const passwordHash = await hashPassword(password);

      const user = await prisma.user.create({
        data: { email, passwordHash, displayName },
      });

      const token = generateToken(user.id);

      res.status(201).json({
        token,
        user: { id: user.id, email: user.email, displayName: user.displayName },
      });
    } catch (err) {
      console.error("Registration error:", err.message);
      res.status(500).json({ error: "Failed to register user" });
    }
  });

  // Log in an existing user
  router.post("/api/auth/login", async (req, res) => {
    try {
      const { email, password } = req.body;

      if (!email || !password) {
        return res
          .status(400)
          .json({ error: "email and password are required" });
      }

      const user = await prisma.user.findUnique({ where: { email } });
      if (!user) {
        return res.status(401).json({ error: "Invalid email or password" });
      }

      const valid = await comparePassword(password, user.passwordHash);
      if (!valid) {
        return res.status(401).json({ error: "Invalid email or password" });
      }

      const token = generateToken(user.id);

      res.json({
        token,
        user: { id: user.id, email: user.email, displayName: user.displayName },
      });
    } catch (err) {
      console.error("Login error:", err.message);
      res.status(500).json({ error: "Failed to log in" });
    }
  });

  // Get authenticated user's profile
  router.get("/api/auth/me", authenticate, async (req, res) => {
    try {
      const user = await prisma.user.findUnique({
        where: { id: req.userId },
        select: {
          id: true,
          email: true,
          displayName: true,
          createdAt: true,
          updatedAt: true,
        },
      });

      if (!user) {
        return res.status(404).json({ error: "User not found" });
      }

      res.json({ user });
    } catch (err) {
      console.error("Profile fetch error:", err.message);
      res.status(500).json({ error: "Failed to fetch profile" });
    }
  });

  return router;
};
