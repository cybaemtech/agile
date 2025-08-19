/**
 * Helper functions for email validation
 */

/**
 * Validates an array of email addresses to check if they are corporate emails
 * @param emails Array of email addresses to validate
 * @returns Object containing arrays of valid and invalid email addresses
 */
export function validateCorporateEmails(emails: string[]): { valid: string[], invalid: string[] } {
  const valid: string[] = [];
  const invalid: string[] = [];
  
  // List of common personal email domains to reject
  const personalDomains = [
    'gmail.com', 'yahoo.com', 'hotmail.com', 'outlook.com', 
    'aol.com', 'icloud.com', 'protonmail.com', 'mail.com',
    'live.com', 'msn.com', 'me.com', 'ymail.com', 'gmx.com'
  ];
  
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  
  for (const email of emails) {
    const trimmedEmail = email.trim();
    
    // Skip empty emails
    if (!trimmedEmail) continue;
    
    // Check if it's a valid email format
    if (!emailRegex.test(trimmedEmail)) {
      invalid.push(trimmedEmail);
      continue;
    }
    
    // Check if it's not a personal domain
    const domain = trimmedEmail.split('@')[1].toLowerCase();
    if (personalDomains.includes(domain)) {
      invalid.push(trimmedEmail);
    } else {
      valid.push(trimmedEmail);
    }
  }
  
  return { valid, invalid };
}

/**
 * Checks if a single email address is a valid corporate email
 * @param email Email address to validate
 * @returns Boolean indicating if the email is valid
 */
export function isValidCorporateEmail(email: string): boolean {
  const { valid } = validateCorporateEmails([email]);
  return valid.length === 1;
}
