const https = require('https');
const fs = require('fs');
const path = require('path');

const pageId = '1255894134276290';
const token = 'EAA7ua8O7GewBSdTZCgr6oGIJaUhjaIMxEQMTPQomc2CpbVQZCZChZBH1RQqmNZBHiZBM7IB6kPDyklNyfqPhLm0CLmhG2Y9ZAFGIW9IXzg84SDUj5D2wEHmM4PJVZBGUXTTzwCK9MhPngIU9ex5XnKFHoUTCgtz1BUIwdglk0zZCIYRV3slFn92vcuMwRZBLfgQBgeuPvjZBxbeiqCVisAzLHAhO6uU8sTwzlfoAGsF6rcZD';

async function uploadMultipartAvatar() {
  const filePath = path.resolve('projects/jack-core-set/core_8_studio_halffiguur_zwart.jpg');
  const fileBuffer = fs.readFileSync(filePath);
  const boundary = '----WebKitFormBoundary' + Math.random().toString(36).substring(2);

  const head = Buffer.from(
    `--${boundary}\r\nContent-Disposition: form-data; name="source"; filename="avatar.jpg"\r\nContent-Type: image/jpeg\r\n\r\n`
  );
  const tail = Buffer.from(`\r\n--${boundary}--\r\n`);
  const fullBody = Buffer.concat([head, fileBuffer, tail]);

  const options = {
    hostname: 'graph.facebook.com',
    port: 443,
    path: `/v21.0/${pageId}/picture?access_token=${token}`,
    method: 'POST',
    headers: {
      'Content-Type': `multipart/form-data; boundary=${boundary}`,
      'Content-Length': fullBody.length
    }
  };

  const req = https.request(options, res => {
    let d = '';
    res.on('data', c => d += c);
    res.on('end', () => console.log('Multipart Profile Picture Result:', res.statusCode, d));
  });

  req.write(fullBody);
  req.end();
}

uploadMultipartAvatar().catch(console.error);
