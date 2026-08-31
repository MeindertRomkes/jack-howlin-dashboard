const fs = require('fs');
const https = require('https');

const filePath = 'projects/hate-me-social-production/hate_me_chorus_15s.mp3';
const fileData = fs.readFileSync(filePath);
const boundary = '----WebKitFormBoundary' + Math.random().toString(36).substring(2);

const header = Buffer.from(
  '--' + boundary + '\r\n' +
  'Content-Disposition: form-data; name="file"; filename="hate_me_chorus_15s.mp3"\r\n' +
  'Content-Type: audio/mpeg\r\n\r\n'
);
const footer = Buffer.from('\r\n--' + boundary + '--\r\n');
const body = Buffer.concat([header, fileData, footer]);

const req = https.request('https://tmpfiles.org/api/v1/upload', {
  method: 'POST',
  headers: {
    'Content-Type': 'multipart/form-data; boundary=' + boundary,
    'Content-Length': body.length
  }
}, (res) => {
  let data = '';
  res.on('data', d => data += d);
  res.on('end', () => {
    try {
      const json = JSON.parse(data);
      if (json.data && json.data.url) {
        const directUrl = json.data.url.replace('tmpfiles.org/', 'tmpfiles.org/dl/');
        console.log('PUBLIC_AUDIO_URL:', directUrl);
      } else {
        console.log('Response:', data);
      }
    } catch (e) {
      console.error('Error parsing:', data);
    }
  });
});

req.on('error', console.error);
req.write(body);
req.end();
