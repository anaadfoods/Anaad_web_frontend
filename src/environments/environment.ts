// const apiBaseUrl = 'https://bck-dev.anaadfoods.com';
// // const apiBaseUrl = 'https://educated-carpentry-reverence.ngrok-free.dev';
// export const environment = {
//   production: false,
//   apiBaseUrl,
//   googleClientId: '356514741847-1000gjfkvl9b1pmp9iqcc8do7vebo1ap.apps.googleusercontent.com',
//   appleClientId: 'com.anaad.foods.ios.signin',
//   appleServiceId: 'com.anaad.foods.ios.signin',
//   appleRedirectUri: `${apiBaseUrl}/api/auth/apple/callback/`,
//   appleWebCallbackPath: '/auth/apple/callback',
//   externalLoginUrl: 'https://bck-dev.anaadfoods.com/',
// };
// environment.ts (dev)
// anaad_backend dev runs in Docker with host port 8300 -> container 8000 (see anaad_backend_infra/dev/docker-compose.yml).
const apiBaseUrl = 'http://localhost:8300';
// const apiBaseUrl = 'http://localhost:8000';
// const apiBaseUrl = 'https://educated-carpentry-reverence.ngrok-free.dev';

export const environment = {
  production: false,
  /** TEMP: set false before commit/push — skips login for local Aahar Vigyan testing */
  devBypassAuth: false,
  apiBaseUrl,
  aaharVigyanEnabled: false,
  showApiDeliveryDate: false,
  googleClientId: '356514741847-1000gjfkvl9b1pmp9iqcc8do7vebo1ap.apps.googleusercontent.com',
  appleClientId: 'com.anaad.foods.ios.signin',
  appleServiceId: 'com.anaad.foods.ios.signin',
  appleRedirectUri: `${apiBaseUrl}/api/auth/apple/callback/`,
  appleWebCallbackPath: '/auth/apple/callback',
  externalLoginUrl: 'https://anaadfoods.com/profile',  // ← fixed: now matches frontend, not backend
  sutraBaseUrl: 'http://localhost:8010',
  // Notifications WebSocket server (dev-web-ws-1 maps host 9300 -> container 9000),
  // which is a different port than the HTTP API (8300).
  wsBaseUrl: 'ws://localhost:9300',
};