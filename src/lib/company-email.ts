const PERSONAL_EMAIL_DOMAINS = new Set([
  'gmail.com', 'googlemail.com',
  'yahoo.com', 'yahoo.co.uk', 'yahoo.fr', 'ymail.com',
  'hotmail.com', 'hotmail.co.uk', 'outlook.com', 'live.com', 'msn.com',
  'aol.com', 'icloud.com', 'me.com', 'mac.com',
  'proton.me', 'protonmail.com', 'gmx.com', 'gmx.net',
  'mail.com', 'yandex.com', 'yandex.ru', 'zoho.com', 'fastmail.com',
]);

export function emailDomain(email: string): string {
  return email.trim().toLowerCase().split('@')[1] || '';
}

export function isCompanyEmail(email: string): boolean {
  const domain = emailDomain(email);
  return Boolean(domain && domain.includes('.') && !PERSONAL_EMAIL_DOMAINS.has(domain));
}

export const COMPANY_EMAIL_ERROR =
  'Use your official company email address. Personal email services such as Gmail, Yahoo and Outlook are not accepted for employer accounts.';
