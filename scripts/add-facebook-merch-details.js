const https = require('https');
const admin = require('firebase-admin');
const path = require('path');
const { randomUUID } = require('crypto');

if (!admin.apps.length) {
  admin.initializeApp({
    projectId: 'jack-howlin-dashboard',
    storageBucket: 'jack-howlin-dashboard.firebasestorage.app'
  });
}

const db = admin.firestore();
const pageId = '1255894134276290';
const token = 'EAA7ua8O7GewBSdTZCgr6oGIJaUhjaIMxEQMTPQomc2CpbVQZCZChZBH1RQqmNZBHiZBM7IB6kPDyklNyfqPhLm0CLmhG2Y9ZAFGIW9IXzg84SDUj5D2wEHmM4PJVZBGUXTTzwCK9MhPngIU9ex5XnKFHoUTCgtz1BUIwdglk0zZCIYRV3slFn92vcuMwRZBLfgQBgeuPvjZBxbeiqCVisAzLHAhO6uU8sTwzlfoAGsF6rcZD';

async function uploadToStorage(filePath, contentType) {
  const destination = 'facebook-assets/' + Date.now() + '_' + path.basename(filePath);
  const downloadToken = randomUUID();
  const bucket = admin.storage().bucket();
  await bucket.upload(filePath, {
    destination,
    metadata: {
      contentType,
      metadata: { firebaseStorageDownloadTokens: downloadToken }
    }
  });
  const bucketName = bucket.name;
  const encodedPath = encodeURIComponent(destination);
  return 'https://firebasestorage.googleapis.com/v0/b/' + bucketName + '/o/' + encodedPath + '?alt=media&token=' + downloadToken;
}

function postGraphApi(endpoint, dataObj) {
  return new Promise((resolve, reject) => {
    const postData = new URLSearchParams({
      access_token: token,
      ...dataObj
    }).toString();

    const options = {
      hostname: 'graph.facebook.com',
      port: 443,
      path: '/v21.0' + endpoint,
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
        'Content-Length': Buffer.byteLength(postData)
      }
    };

    const req = https.request(options, res => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        try {
          resolve({ statusCode: res.statusCode, data: JSON.parse(data || '{}') });
        } catch (e) {
          resolve({ statusCode: res.statusCode, raw: data });
        }
      });
    });
    req.on('error', reject);
    req.write(postData);
    req.end();
  });
}

async function main() {
  console.log('1. Updating Page About / Description with Merch Store Link...');
  const updatedAbout = "Jack Howlin' — Outlaw Country & Dark Americana.\n\n🛒 Official Merch Store: https://jackhowlin.com/#merch\n🎵 Stream Music: https://jackhowlin.com\n⚡ Tour Dates & Updates: https://jackhowlin.com";

  const updateRes = await postGraphApi('/' + pageId, {
    about: updatedAbout,
    website: 'https://jackhowlin.com/#merch'
  });
  console.log('Update About Result:', updateRes);

  console.log('\n2. Publishing Official Merch Spotlight Post on Facebook...');
  const merchImageLocal = path.resolve('projects/hate-me-social-production/1788259680638_08_backstage_stairs_duo.jpg');
  let merchImageUrl = '';
  
  if (require('fs').existsSync(merchImageLocal)) {
    merchImageUrl = await uploadToStorage(merchImageLocal, 'image/jpeg');
  } else {
    // fallback to storage
    merchImageUrl = 'https://firebasestorage.googleapis.com/v0/b/jack-howlin-dashboard.firebasestorage.app/o/posts%2F1788259680638_08_backstage_stairs_duo.jpg?alt=media&token=43e551b9-7e2e-4f63-bdae-146d43b58f77';
  }

  const merchCaption = `Worn in, built to last. The Official Jack Howlin Collection is available now. ⚡🥃\n\nHeavyweight Vintage Hoodies, Graphic Tour Tees, Outlaw Enamel Campfire Mugs & Trucker Caps.\n\n📦 First batch ships worldwide.\n👉 Order direct from the store: https://jackhowlin.com/#merch\n\n#JackHowlin #HateMeAllYouWant #MerchCollection #OutlawCountry #AmericanaApparel #BandMerch`;

  const merchPostRes = await postGraphApi('/' + pageId + '/photos', {
    url: merchImageUrl,
    caption: merchCaption
  });
  console.log('Merch Spotlight Post Result:', merchPostRes);

  console.log('\n=== MERCH DETAILS & POST SUCCESSFULLY ADDED TO FACEBOOK! ===');
}

main().catch(console.error);
