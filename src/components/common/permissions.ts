import { normalizeRole } from "../../routes/RoleProtectedRoute";

// Jo roles sirf VIEW kar sakte hain — koi action (add/edit/delete/upload) allowed nahi
const READ_ONLY_ROLES = ["engineers", "engineer"];

/**
 * Check karta hai ki diya gaya role read-only hai ya nahi.
 * Read-only role ke liye — sirf data dikhega, koi action button nahi milega.
 */
export const isReadOnlyRole = (role?: string | null): boolean => {
  if (!role) return false;
  return READ_ONLY_ROLES.includes(normalizeRole(role));
};