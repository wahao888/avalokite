export const INVOICE_EMAIL_LIMIT = 80;
export const INVOICE_COMPANY_LIMIT = 60;
export const INVOICE_ADDRESS_LIMIT = 100;
export const INVOICE_CARRIER_PATTERN = "\\/[0-9A-Z+.\\-]{7}|[A-Z]{2}[0-9]{14}";
export const invoiceCarrierPattern = new RegExp(`^(?:${INVOICE_CARRIER_PATTERN})$`);

export function validTaxId(value: string) {
  if (!/^\d{8}$/.test(value)) return false;
  const weights = [1, 2, 1, 2, 1, 2, 4, 1];
  const sum = weights.reduce((total, weight, index) => {
    const product = Number(value[index]) * weight;
    return total + Math.floor(product / 10) + (product % 10);
  }, 0);
  return sum % 5 === 0 || (value[6] === "7" && (sum + 1) % 5 === 0);
}
