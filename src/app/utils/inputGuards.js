// Keystroke-level filters for form inputs that have one correct shape —
// applied in onChange so invalid characters (spaces, symbols) never make it
// into state at all, instead of being caught later by a submit-time regex.

export const digitsOnly = (value, maxLen) => {
  const cleaned = value.replace(/\D/g, "");
  return maxLen ? cleaned.slice(0, maxLen) : cleaned;
};

export const lettersAndSpacesOnly = (value, maxLen) => {
  const cleaned = value.replace(/[^A-Za-z\s.'-]/g, "").replace(/\s{2,}/g, " ");
  return maxLen ? cleaned.slice(0, maxLen) : cleaned;
};

export const alnumUpper = (value, maxLen) => {
  const cleaned = value.replace(/[^A-Za-z0-9]/g, "").toUpperCase();
  return maxLen ? cleaned.slice(0, maxLen) : cleaned;
};

// Takes the LAST 10 digits, not the first — a pasted number with a +91
// country code (e.g. "+91 98765 43210") would otherwise get truncated to
// "9198765432" (91 + the first 8 real digits) instead of the real number.
export const phoneFilter = (value) => {
  const digits = value.replace(/\D/g, "");
  return digits.slice(-10);
};
export const panFilter = (value) => alnumUpper(value, 10);
export const gstFilter = (value) => alnumUpper(value, 15);
export const ifscFilter = (value) => alnumUpper(value, 11);
export const accountNumberFilter = (value) => digitsOnly(value, 18);
export const yearFilter = (value) => digitsOnly(value, 4);
export const nameFilter = (value) => lettersAndSpacesOnly(value, 80);

// Business/company names legitimately contain digits, &, ., ,, -, ' —
// only strip characters that could never appear in a real registered name
// (emoji, control chars, most punctuation).
export const businessNameFilter = (value, maxLen = 120) => {
  const cleaned = value.replace(/[^A-Za-z0-9\s.,&'-]/g, "").replace(/\s{2,}/g, " ");
  return maxLen ? cleaned.slice(0, maxLen) : cleaned;
};

// Government ID numbers — the correct shape depends on which ID type is
// selected, not one generic length for all of them. Aadhaar is exactly 12
// digits (nothing else is ever valid, so digitsOnly beats alnum here);
// Passport and Driving Licence are alphanumeric with looser real-world
// length variance, so those get a generous cap rather than a strict format.
export const idNumberFilterFor = (idType, value) => {
  if (idType === "Aadhaar Card") return digitsOnly(value, 12);
  if (idType === "Passport") return alnumUpper(value, 9);
  return alnumUpper(value, 16); // Driving Licence
};

// Generic fallback (no idType context available) — alphanumeric, no spaces
// or symbols, forced uppercase.
export const idNumberFilter = (value, maxLen = 20) => alnumUpper(value, maxLen);
