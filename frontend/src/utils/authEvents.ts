export const AUTH_TOKEN_CHANGED_EVENT = 'auth-token-changed';

export function notifyAuthTokenChanged() {
  window.dispatchEvent(new Event(AUTH_TOKEN_CHANGED_EVENT));
}
