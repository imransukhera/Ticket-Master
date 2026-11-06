// These values are public (they ship in the browser bundle), so no secrets here.
export const environment = {
  production: false,
  apiUrl: 'https://h2ufn6ambj.execute-api.ap-southeast-2.amazonaws.com',
  cognito: {
    region: 'ap-southeast-2',
    userPoolId: 'ap-southeast-2_BKY6qlSTc',
    clientId: '6ttahruc0ts6iliavlt7jbl28i',
    domain: 'https://ap-southeast-2bky6qlstc.auth.ap-southeast-2.amazoncognito.com',
    // Must exactly match the callback / sign-out URLs configured on the Cognito app client.
    redirectUri: 'http://localhost:4200',
    logoutUri: 'http://localhost:4200',
    // Set to true once logoutUri is in the app client's "Allowed sign-out URLs";
    // sign-out then returns to SupportFlow's login page instead of Cognito's sign-in page.
    useSignOutUrl: false,
    scopes: 'openid email',
  },
};
