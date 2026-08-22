export type ResendConfig = {
  apiKey: string;
  fromEmail: string;
};

/** Email is optional and skipped unless both settings are configured. */
export function getResendConfig(): ResendConfig | null {
  const apiKey = process.env.RESEND_API_KEY?.trim();
  const fromEmail = process.env.RESEND_FROM_EMAIL?.trim();
  if (!apiKey || !fromEmail) return null;
  return { apiKey, fromEmail };
}
