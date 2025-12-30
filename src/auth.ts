import { Request, Response, NextFunction } from "express";
import jwt from "jsonwebtoken";
import bcrypt from "bcryptjs";

const JWT_SECRET = process.env.JWT_SECRET || "change-me-in-production";
const ADMIN_USERS = process.env.ADMIN_USERS || "";

interface User {
  username: string;
  passwordHash: string;
}

interface JWTPayload {
  username: string;
}

// Parse users from environment variable
// Format: username1:password1,username2:password2
function parseUsers(): User[] {
  if (!ADMIN_USERS) return [];
  
  return ADMIN_USERS.split(",").map((userStr) => {
    const [username, password] = userStr.split(":");
    if (!username || !password) {
      throw new Error(`Invalid ADMIN_USERS format: ${userStr}`);
    }
    // Hash the password
    const passwordHash = bcrypt.hashSync(password, 10);
    return { username: username.trim(), passwordHash };
  });
}

const users = parseUsers();

export function validateCredentials(
  username: string,
  password: string
): boolean {
  const user = users.find((u) => u.username === username);
  if (!user) return false;
  return bcrypt.compareSync(password, user.passwordHash);
}

export function generateToken(username: string): string {
  const payload: JWTPayload = { username };
  return jwt.sign(payload, JWT_SECRET, { expiresIn: "30d" });
}

export function verifyToken(token: string): JWTPayload | null {
  try {
    return jwt.verify(token, JWT_SECRET) as JWTPayload;
  } catch {
    return null;
  }
}

// Middleware to protect routes
export function requireAuth(req: Request, res: Response, next: NextFunction) {
  const authHeader = req.headers.authorization;
  
  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    res.status(401).json({ ok: false, error: "No token provided" });
    return;
  }

  const token = authHeader.substring(7);
  const payload = verifyToken(token);

  if (!payload) {
    res.status(401).json({ ok: false, error: "Invalid or expired token" });
    return;
  }

  // Attach user info to request
  (req as any).user = payload;
  next();
}
