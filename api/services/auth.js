const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");

const SALT_ROUNDS = 12;

function getSecret() {
  const secret = process.env.JWT_SECRET;
  if (!secret) throw new Error("JWT_SECRET is not set in environment");
  return secret;
}

async function hashPassword(plain) {
  return bcrypt.hash(plain, SALT_ROUNDS);
}

async function comparePassword(plain, hash) {
  return bcrypt.compare(plain, hash);
}

function generateToken(userId) {
  return jwt.sign({ userId }, getSecret(), { expiresIn: "7d" });
}

function verifyToken(token) {
  return jwt.verify(token, getSecret());
}

module.exports = { hashPassword, comparePassword, generateToken, verifyToken };
