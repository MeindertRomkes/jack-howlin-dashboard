const fs = require('fs');
const https = require('https');

const filePath = 'projects/hate-me-social-production/hate_me_chorus_15s.mp3';
const fileData = fs.readFileSync(filePath);
const boundary = '----WebKitFormBoundary' + Math.random().toString(36).substring(2);

const header = Buffer.from(
  '--' + boundary + '\r\n' +
  'Content-Disposition: form-data; name="reqtype"\r\n\r\nfileupload\r\n' +
  '--' + boundary + '\r\n' +
  'Content-Disposition: form-data; name="fileToUpload"; filename="hate_me_chorus_15s.mp3"\r\n' +
  'Content-Type: audio/mpeg\r\n\r\n'
);
const footer = Buffer.from('\r\n--' + boundary + '--\r\n');
const body = Buffer.concat([header, fileData, footer]);

const req = https.request('https://catbox.moe/user/api.php', {
  method: 'POST',
  headers: {
    'Content-Type': 'multipart/form-data; boundary=' + boundary,
    'Content-Length': body.length,
    'User-Agent': 'Mozilla/5.0'
  }
}, (res) => {
  let data = '';
  res.on('data', d => data += d);
  res.on('end', () => {
    console.log('CATBOX_URL:', data.trim());
  });
});

req.on('error', console.error);
req.write(body);
req.end();
