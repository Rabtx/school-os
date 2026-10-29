/**
 * A phone number as WhatsApp wants it: country code and digits, no plus. Local Pakistani numbers
 * ("0300 1234567") get +92; anything that cannot be a mobile number is null.
 */
export function toWhatsAppNumber(
	raw: string | null | undefined,
	defaultCountryCode = '92',
): string | null {
	if (!raw) return null;
	let digits = raw.replace(/[^\d+]/g, '');
	if (digits.startsWith('+')) digits = digits.slice(1);
	else if (digits.startsWith('00')) digits = digits.slice(2);
	else if (digits.startsWith('0')) digits = `${defaultCountryCode}${digits.slice(1)}`;
	digits = digits.replace(/\D/g, '');
	return digits.length >= 10 && digits.length <= 15 ? digits : null;
}
