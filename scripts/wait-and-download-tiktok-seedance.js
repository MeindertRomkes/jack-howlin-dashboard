const { execSync } = require('child_process');
const admin = require('firebase-admin');
const { randomUUID } = require('crypto');
const path = require('path');
const fs = require('fs');
const dotenv = require('dotenv');

dotenv.config({ path: '.env.local' });
dotenv.config();

if (!admin.apps.length) {
  admin.initializeApp({
    projectId: 'jack-howlin-dashboard',
    storageBucket: 'jack-howlin-dashboard.firebasestorage.app'
  });
}

const taskId = 'c1fbebf531d78feb6df4849bbbb5a5eb';
const rootDir = process.cwd();
const cliBin = path.join(rootDir, 'node_modules', '@felores', 'kie-cli', 'dist', 'index.js');
const env = { ...process.env, KIE_AI_API_KEY: process.env.KIE_AI_API_KEY || '10e19446174f4f74a4237b3bce6a8863' };

async function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

async function checkTask() {
  console.log(`================================================================`);
  console.log(`⏳ POLLING 30S SEEDANCE 2.5 TASK: ${taskId}`);
  console.log(`================================================================\n`);

  let attempts = 0;
  const maxAttempts = 60; // up to ~20 minutes

  while (attempts < maxAttempts) {
    attempts++;
    console.log(`[Attempt ${attempts}] Checking 30s status at ${new Date().toLocaleTimeString()}...`);

    try {
      const output = execSync(`node "${cliBin}" get_task_status --task_id "${taskId}" --json`, { env, encoding: 'utf8' });
      const res = JSON.parse(output.trim());

      const status = (res.status || res.state || res.data?.status || '').toUpperCase();
      console.log('Task Status:', status);

      const resultUrls = res.result_urls || (res.api_response?.data?.resultJson ? JSON.parse(res.api_response.data.resultJson).resultUrls : null);
      const videoUrl = (resultUrls && resultUrls[0]) || res.video_url || res.url;

      if (status === 'SUCCESS' || status === 'COMPLETED' || videoUrl) {
        console.log('\n🎉 30S VIDEO GENERATION COMPLETED!');
        console.log('Video URL:', videoUrl);

        if (videoUrl) {
          console.log(`\n⬇️  Downloading 30s master MP4 from: ${videoUrl}`);
          const fetchRes = await fetch(videoUrl, { headers: { 'User-Agent': 'Mozilla/5.0' } });
          const buffer = Buffer.from(await fetchRes.arrayBuffer());

          const localPath = path.join(rootDir, 'projects', 'hate-me-social-production', 'midnight_mirage_tiktok_30s_master.mp4');
          fs.writeFileSync(localPath, buffer);
          console.log(`💾 Saved locally to: ${localPath} (${(buffer.length / 1024 / 1024).toFixed(2)} MB)`);

          // Upload to Firebase Storage
          const bucket = admin.storage().bucket();
          const token = randomUUID();
          const storagePath = `posts/${Date.now()}_midnight_mirage_tiktok_30s_master.mp4`;

          await bucket.upload(localPath, {
            destination: storagePath,
            metadata: {
              contentType: 'video/mp4',
              metadata: { firebaseStorageDownloadTokens: token }
            }
          });

          const publicStorageUrl = `https://firebasestorage.googleapis.com/v0/b/${bucket.name}/o/${encodeURIComponent(storagePath)}?alt=media&token=${token}`;
          console.log(`☁️  Firebase Storage URL: ${publicStorageUrl}`);

          // Register in Firestore collection
          const firestore = admin.firestore();
          const postDoc = await firestore.collection('posts').add({
            title: 'Midnight Mirage Motel — 30s Full Short Film (TikTok / Reels)',
            caption: `3:30 AM. Dead highway. Room 17 is waiting.\n\nSome doors don't take you anywhere. They bring everything back. 🗝️🏜️\n\nStarring Jack Howlin', June Holloway & Abel Graves.\nFull 30s Master Soundtrack: "Midnight Mirage Motel"\n\n#JackHowlin #MidnightMirageMotel #Room17 #NeoWestern #OutlawCountry #SouthernGothic #CinematicShortFilm #Seedance25`,
            mediaUrl: publicStorageUrl,
            mediaType: 'video',
            platforms: ['tiktok', 'instagram_reels', 'youtube_shorts'],
            status: 'draft',
            createdAt: admin.firestore.Timestamp.now(),
            taskId: taskId,
            metadata: {
              characters: ['Jack Howlin', 'June Holloway', 'Abel Graves'],
              location: 'Midnight Mirage Motel (Exterior, Reception, Room 17)',
              resolution: '720p',
              aspectRatio: '9:16',
              duration: 30
            }
          });

          console.log(`\n✅ 30s Post geregistreerd in Firestore: docId=${postDoc.id}`);
          return;
        }
      } else if (status === 'FAILED' || status === 'FAIL') {
        console.error('❌ Task failed:', res);
        return;
      }
    } catch (err) {
      console.warn('Poll error:', err.message);
    }

    await sleep(25000); // wait 25s
  }
}

checkTask().catch(console.error);
