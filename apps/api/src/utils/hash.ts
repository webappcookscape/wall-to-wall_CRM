import crypto from "node:crypto";

export const hashValue = (value: unknown): string | undefined => {
  if (!value) return undefined;

  return crypto
    .createHash("sha256")
    .update(String(value).trim().toLowerCase())
    .digest("hex");
};
