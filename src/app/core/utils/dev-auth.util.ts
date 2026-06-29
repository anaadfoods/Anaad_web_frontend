export const DEV_BYPASS_ACCESS = 'dev-bypass-access-token';
export const DEV_BYPASS_REFRESH = 'dev-bypass-refresh-token';

export function isDevBypassToken(token: string | null | undefined): boolean {
  return token === DEV_BYPASS_ACCESS || token === DEV_BYPASS_REFRESH;
}

export function isDevBypassSession(access: string | null | undefined, refresh: string | null | undefined): boolean {
  return isDevBypassToken(access) || isDevBypassToken(refresh);
}
