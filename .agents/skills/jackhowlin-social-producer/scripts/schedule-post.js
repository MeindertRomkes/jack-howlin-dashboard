#!/usr/bin/env node
/**
 * scripts/schedule-post.js
 * Uploads a social media asset to Firebase Storage and schedules the post into the Dashboard Content Calendar.
 *
 * Gebruik:
 *   node schedule-post.js --media <path> --caption "<text>" --title "<title>" --platforms "instagram,tiktok,youtube" --datetime "2026-08-31T19:45:00"
 */

const admin = require('firebase-admin');
const { randomUUID } = require('crypto');
const path = require('path');
const fs = require('fs');

if (!admin.apps.length) {
  admin.initializeApp({
    projectId: 'jack-howlin-dashboard',
    storageBucket: 'jack-howlin-dashboard.firebasestorage.app'
  });
}

function parseArgs() {
  const args = process.argv.slice(2);
  const params = {
    media: '',
    caption: '',
    title: '',
    platforms: 'instagram,tiktok,youtube',
    datetime: '',
    tags: ''
  };

  for (let i = 0; i < args.length; i++) {
    if (args[i] === '--media' && args[i + 1]) params.media = args[++i];
    else if (args[i] === '--caption' && args[i + 1]) params.caption = args[++i];
    else if (args[i] === '--title' && args[i + 1]) params.title = args[++i];
    else if (args[i] === '--platforms' && args[i + 1]) params.platforms = args[++i];
    else if (args[i] === '--datetime' && args[i + 1]) params.datetime = args[++i];
    else if (args[i] === '--tags' && args[i + 1]) params.tags = args[++i];
  }

  return params;
}

async function run() {
  const params = parseArgs();

  if (!params.caption) {
    console.error('Fout: --caption is verplicht.');
    process.exit(1);
  }

  let mediaUrl = null;
  let mediaType = null;

  if (params.media) {
    const filePath = path.resolve(params.media);
    if (!fs.existsSync(filePath)) {
      console.error(`Fout: Media bestand niet gevonden: ${filePath}`);
      process.exit(1);
    }

    const isVideo = filePath.endsWith('.mp4') || filePath.endsWith('.mov');
    mediaType = isVideo ? 'video' : 'image';
    const ext = path.extname(filePath);
    const destination = `posts/${Date.now()}_${path.basename(filePath)}`;
    const token = randomUUID();

    console.log(`Uploaden ${mediaType} naar Firebase Storage...`);
    const bucket = admin.storage().bucket();
    await bucket.upload(filePath, {
      destination,
      metadata: {
        contentType: isVideo ? 'video/mp4' : 'image/png',
        metadata: { firebaseStorageDownloadTokens: token }
      }
    });

    const bucketName = bucket.name;
    const encodedPath = encodeURIComponent(destination);
    mediaUrl = `https://firebasestorage.googleapis.com/v0/b/${bucketName}/o/${encodedPath}?alt=media&token=${token}`;
    console.log(`Media URL gegenereerd: ${mediaUrl}`);
  }

  const platformsArray = params.platforms.split(',').map(p => p.trim());
  const scheduledDate = params.datetime ? new Date(params.datetime) : new Date(Date.now() + 2 * 60 * 60 * 1000);
  const tagsArray = params.tags ? params.tags.split(',').map(t => t.trim().replace(/^#/, '')) : ['JackHowlin', 'OutlawCountry'];

  const db = admin.firestore();
  const docRef = await db.collection('posts').add({
    platforms: platformsArray,
    title: params.title || 'Jack Howlin Social Post',
    caption: params.caption,
    tags: tagsArray,
    mediaUrl: mediaUrl,
    mediaType: mediaType,
    scheduledAt: admin.firestore.Timestamp.fromDate(scheduledDate),
    status: 'scheduled',
    platformResults: {},
    postedAt: null,
    errorMessage: null,
    createdAt: admin.firestore.Timestamp.now(),
  });

  console.log(`Post succesvol ingepland in kalender! Doc ID: ${docRef.id}`);
  console.log(`Gepland voor: ${scheduledDate.toISOString()}`);
}

run().catch(console.error);
