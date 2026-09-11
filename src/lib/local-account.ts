// Public demo credentials. This is an isolated local profile, not server authentication.
export const TEST_LOGIN = "test";
export const TEST_PASSWORD = "Scratchlas123";
export function validTestCredentials(login: string, password: string) {
  return login.trim().toLowerCase() === TEST_LOGIN && password === TEST_PASSWORD;
}
