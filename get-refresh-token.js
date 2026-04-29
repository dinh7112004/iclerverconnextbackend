const { google } = require('googleapis');
const readline = require('readline');
const dotenv = require('dotenv');
const path = require('path');

// Load .env
dotenv.config();

const clientId = process.env.GOOGLE_CLIENT_ID;
const clientSecret = process.env.GOOGLE_CLIENT_SECRET;
const redirectUri = 'http://localhost:3000/api/v1/auth/google/callback'; // Match your .env or common redirect

if (!clientId || !clientSecret) {
  console.error('Error: GOOGLE_CLIENT_ID or GOOGLE_CLIENT_SECRET is missing in .env');
  process.exit(1);
}

const oauth2Client = new google.auth.OAuth2(clientId, clientSecret, redirectUri);

// Scope for Google Drive
const SCOPES = ['https://www.googleapis.com/auth/drive.file', 'https://www.googleapis.com/auth/drive'];

const authUrl = oauth2Client.generateAuthUrl({
  access_type: 'offline',
  scope: SCOPES,
  prompt: 'consent', // Force to get refresh token
});

console.log('--- GOOGLE OAUTH2 TOKEN GETTER ---');
console.log('1. Open this URL in your browser:');
console.log('\x1b[36m%s\x1b[0m', authUrl);
console.log('\n2. After authorizing, you will be redirected to a URL like:');
console.log('   http://localhost:3000/api/v1/auth/google/callback?code=4/0AdQt8...&scope=...');
console.log('\n3. Copy the "code" value (everything between "code=" and the next "&") and paste it here:');

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout,
});

rl.question('Enter the code here: ', async (code) => {
  try {
    const { tokens } = await oauth2Client.getToken(code);
    console.log('\n--- SUCCESS! ---');
    console.log('New Refresh Token:');
    console.log('\x1b[32m%s\x1b[0m', tokens.refresh_token);
    console.log('\nCopy this token and update GOOGLE_REFRESH_TOKEN in your .env file.');
    if (!tokens.refresh_token) {
        console.log('\x1b[31mWarning: No refresh_token returned. This usually happens if you didn\'t revoke the previous access or didn\'t see the "consent" screen. Try again in an Incognito window.\x1b[0m');
    }
  } catch (error) {
    console.error('Error retrieving access token:', error.response ? error.response.data : error.message);
  } finally {
    rl.close();
  }
});
