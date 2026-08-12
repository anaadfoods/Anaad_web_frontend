// const apiBaseUrl = 'https://bck-dev.anaadfoods.com';
// // const apiBaseUrl = 'https://educated-carpentry-reverence.ngrok-free.dev';

// export const environment = {
//   production: true,
//   apiBaseUrl,
//   googleClientId: '356514741847-1000gjfkvl9b1pmp9iqcc8do7vebo1ap.apps.googleusercontent.com',
//   appleClientId: 'com.anaad.foods.ios.signin',
//   appleServiceId: 'com.anaad.foods.ios.signin',
//   appleRedirectUri: `${apiBaseUrl}/api/auth/apple/callback/`,
//   appleWebCallbackPath: '/auth/apple/callback',
//   externalLoginUrl: 'https://web.anaadfoods.com/profile',
// };


// environment.prod.ts — unchanged, already correct
const apiBaseUrl = 'https://bck.anaadfoods.com';
// const apiBaseUrl = 'https://educated-carpentry-reverence.ngrok-free.dev';

export const environment = {
  production: true,
  devBypassAuth: false,
  apiBaseUrl,
  aaharVigyanEnabled: false,
  showApiDeliveryDate: false,
  googleClientId: '356514741847-1000gjfkvl9b1pmp9iqcc8do7vebo1ap.apps.googleusercontent.com',
  appleClientId: 'com.anaad.foods.ios.signin',
  appleServiceId: 'com.anaad.foods.ios.signin',
  appleRedirectUri: `${apiBaseUrl}/api/auth/apple/callback/`,
  appleWebCallbackPath: '/auth/apple/callback',
  externalLoginUrl: 'https://anaadfoods.com/profile',
};