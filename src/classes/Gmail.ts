export function getUserEmail() {
  return this.getGoogleSessionObject().getActiveUser().getEmail();
}
