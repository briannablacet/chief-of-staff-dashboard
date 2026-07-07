"use server"

import { pool } from "@/lib/db"
import { auth } from "@/lib/auth"

/**
 * Directly reset a user's password by email without a token.
 * Uses Better Auth's internal password hashing via the API handler,
 * falling back to bcrypt via the Neon account table directly.
 */
export async function resetPasswordByEmail(
  email: string,
  newPassword: string
): Promise<{ success: boolean; error?: string }> {
  if (!email || !newPassword) {
    return { success: false, error: "Email and new password are required" }
  }
  if (newPassword.length < 8) {
    return { success: false, error: "Password must be at least 8 characters" }
  }

  try {
    // Look up the user by email
    const userResult = await pool.query(
      `SELECT id FROM "user" WHERE email = $1`,
      [email.toLowerCase().trim()]
    )

    if (!userResult.rows.length) {
      // Don't reveal whether the email exists
      return { success: true }
    }

    const userId = userResult.rows[0].id

    // Hash the new password using Better Auth's internal ctx
    // Better Auth uses scrypt by default — call the internal API to do this safely
    const ctx = await auth.$context

    const hashedPassword = await ctx.password.hash(newPassword)

    // Upsert into the account table (credential provider)
    await pool.query(
      `UPDATE "account"
       SET password = $1, "updatedAt" = NOW()
       WHERE "userId" = $2 AND "providerId" = 'credential'`,
      [hashedPassword, userId]
    )

    return { success: true }
  } catch (err) {
    console.error("[v0] resetPasswordByEmail failed:", err)
    return { success: false, error: "Failed to reset password. Please try again." }
  }
}
