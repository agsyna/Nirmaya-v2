const INDIA_COUNTRY_CODE = "+91";

export const normalizeIndianPhoneForSms = (phone: string | null | undefined) => {
  if (!phone) return null;

  const trimmed = phone.trim();
  if (!trimmed) return null;

  const digits = trimmed.replace(/\D/g, "");
  if (/^[6-9]\d{9}$/.test(digits)) {
    return `${INDIA_COUNTRY_CODE}${digits}`;
  }
  if (/^91[6-9]\d{9}$/.test(digits)) {
    return `+${digits}`;
  }
  if (/^\+91[6-9]\d{9}$/.test(trimmed)) {
    return trimmed;
  }

  return null;
};
