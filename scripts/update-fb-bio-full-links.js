const https = require('https');

const pageId = '1255894134276290';
const token = 'EAA7ua8O7GewBSdTZCgr6oGIJaUhjaIMxEQMTPQomc2CpbVQZCZChZBH1RQqmNZBHiZBM7IB6kPDyklNyfqPhLm0CLmhG2Y9ZAFGIW9IXzg84SDUj5D2wEHmM4PJVZBGUXTTzwCK9MhPngIU9ex5XnKFHoUTCgtz1BUIwdglk0zZCIYRV3slFn92vcuMwRZBLfgQBgeuPvjZBxbeiqCVisAzLHAhO6uU8sTwzlfoAGsF6rcZD';

// Under 101-255 char limit for Facebook Page Header Bio
const shortBio = "Jack Howlin' — Outlaw Country & Dark Americana.\n🛒 Merch: https://jackhowlin.com/merch\n🌐 Music & Links: https://jackhowlin.com";

async function update() {
  console.log('Bio length:', shortBio.length, 'chars');
  const postData = new URLSearchParams({
    access_token: token,
    about: shortBio,
    website: 'https://jackhowlin.com'
  }).toString();

  const options = {
    hostname: 'graph.facebook.com',
    port: 443,
    path: '/v21.0/' + pageId,
    method: 'POST',
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded',
      'Content-Length': Buffer.byteLength(postData)
    }
  };

  const resData = await new Promise(resolve => {
    const req = https.request(options, res => {
      let d = '';
      res.on('data', c => d += c);
      res.on('end', () => resolve({ status: res.statusCode, body: d }));
    });
    req.write(postData);
    req.end();
  });

  console.log('Update Bio Result:', resData.status, resData.body);
}

update().catch(console.error);
