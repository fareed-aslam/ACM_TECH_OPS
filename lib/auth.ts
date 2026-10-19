import jwt from "jsonwebtoken";

const JWT_SECRET = process.env.JWT_SECRET || "acm_tech_trivia_secret_key_2026_xyz";
const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD || "acmadmin2026";

export interface StudentPayload {
  roll: string;
  name: string;
  token: string;
}

export interface AdminPayload {
  role: "admin";
}

/**
 * Sign student token
 */
export function signStudentToken(payload: { roll: string; name: string }): string {
  return jwt.sign(payload, JWT_SECRET, { expiresIn: "24h" });
}

/**
 * Verify student token
 */
export function verifyStudentToken(token: string): { roll: string; name: string } | null {
  try {
    return jwt.verify(token, JWT_SECRET) as { roll: string; name: string };
  } catch {
    return null;
  }
}

/**
 * Check admin password and generate 12-hour token
 */
export function createAdminToken(password: string): string | null {
  const expectedPassword = process.env.ADMIN_PASSWORD || "acmadmin2026";
  if (password !== expectedPassword) {
    return null;
  }
  return jwt.sign({ role: "admin" }, JWT_SECRET, { expiresIn: "12h" });
}

/**
 * Verify admin token from Authorization header
 */
export function verifyAdminToken(authHeader: string | null): boolean {
  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    return false;
  }
  const token = authHeader.substring(7);
  try {
    const decoded = jwt.verify(token, JWT_SECRET) as { role?: string };
    return decoded.role === "admin";
  } catch {
    return false;
  }
}
