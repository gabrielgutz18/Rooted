// Members sign in with a username; only the admin signs in with an email.
// Supabase accounts still need an email, so each username gets a stand-in address on the
// reserved `.invalid` domain (RFC 2606): it can never receive mail, and nobody ever sees it.
// The same rules live in supabase/functions/account/index.ts and the usernames migration.

export const USERNAME_DOMAIN = 'rooted.invalid';
export const USERNAME_RULE = /^[a-z0-9_]{3,20}$/;

export const normalizeUsername = (name: string) => name.trim().toLowerCase();

export const isValidUsername = (name: string) => USERNAME_RULE.test(normalizeUsername(name));

/** The hidden account email behind a username. */
export const usernameEmail = (name: string) => `${normalizeUsername(name)}@${USERNAME_DOMAIN}`;

/** What someone typed in the sign-in box: an email (the admin) or a username (everyone else). */
export const loginEmail = (login: string) => (login.includes('@') ? login.trim() : usernameEmail(login));

export const BAD_USERNAME = 'A username is 3–20 letters, numbers or _ (no spaces).';
