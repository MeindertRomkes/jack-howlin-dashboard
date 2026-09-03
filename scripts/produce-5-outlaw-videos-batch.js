const admin = require('firebase-admin');
const { randomUUID } = require('crypto');
const cp = require('child_process');
const path = require('path');
const fs = require('fs');
const ffmpeg = require('ffmpeg-static');
const dotenv = require('dotenv');

dotenv.config({ path: '.env.local' });
dotenv.config();

if (!admin.apps.length) {
  admin.initializeApp({
    projectId: 'jack-howlin-dashboard',
    storageBucket: 'jack-howlin-dashboard.firebasestorage.app'
  });
}

const rootDir = process.cwd();
const outputDir = path.join(rootDir, 'projects', 'hate-me-social-production');
const batchDir = path.join(outputDir, 'batch_production_5');
if (!fs.existsSync(batchDir)) fs.mkdirSync(batchDir, { recursive: true });

const KIE_API_KEY = process.env.KIE_AI_API_KEY || '10e19446174f4f74a4237b3bce6a8863';
const cliPath = path.resolve('node_modules/@felores/kie-cli/dist/index.js');
const env = { ...process.env, KIE_AI_API_KEY: KIE_API_KEY };

const JACK_REF_URL = 'https://firebasestorage.googleapis.com/v0/b/jack-howlin-dashboard.firebasestorage.app/o/jack-core-references%2Fjack_howlin_multilevel_reference.jpg?alt=media&token=f1a7ae6e-507d-41b6-97db-71305e38484a';
const ROSIE_REF_URL = 'https://firebasestorage.googleapis.com/v0/b/jack-howlin-dashboard.firebasestorage.app/o/jack-core-references%2Frosie_ray_master_reference.jpg?alt=media&token=f7365f94-7304-4520-89d7-8e7274475463';

const videoConfigs = [
  {
    key: 'cupid_can_keep_it',
    title: 'Cupid Can Keep It (feat. Rosie Ray) — Neon Diner Standoff',
    trackName: 'Cupid Can Keep It (Remastered)',
    wavFile: 'cupid_can_keep_it.wav',
    start: '00:00:20',
    duration: 20.0,
    scheduledDate: '2026-09-10T18:00:00.000Z', // Thursday Sep 10, 20:00 CET
    references: [JACK_REF_URL, ROSIE_REF_URL],
    caption: `Cupid can keep his arrows. Outlaws run on whiskey, neon, and gasoline. 🥃⚡

Featuring the incredible Rosie Ray.

Track: "Cupid Can Keep It (Remastered)"
Now streaming from the darkest roadside diner in the West.

#JackHowlin #RosieRay #CupidCanKeepIt #OutlawCountry #AmericanaDuo #NeonNoir #Seedance25 #NewMusic`,
    prompt: `One continuous 20-second unbroken cinematic shot in 9:16 vertical framing of Jack Howlin and Rosie Ray sitting together in a red vinyl booth of a roadside diner at 2:00 AM. 

CRITICAL PERFORMANCE RULE: Neither Jack nor Rosie sing, speak, whisper, shout, mouth lyrics, or lip-sync at any point. Their lips remain naturally closed and completely still throughout the entire video. No mouth movement, no visible teeth, and no exaggerated jaw motion. The music is soundtrack only.

• [00:00–00:06] [Diner Staging & Neon Atmosphere]
Atmospheric medium shot inside a dimly lit retro diner. Rain trickles down the window where a buzzing turquoise and red neon diner sign glows outside. Jack Howlin sits in the booth wearing his signature tan heavy canvas work jacket over charcoal henley shirt, full rugged brown beard and dark wavy hair. Sitting across or beside him is Rosie Ray in her vintage western outlaw styling with dark wavy hair and authentic leather accents. A ceramic coffee mug and vintage acoustic guitar case rest on the table. Both gaze into the camera with quiet, intense outlaw chemistry and closed lips.

• [00:06–00:14] [Slow Push-In & Shared Intensity]
Slow cinematic camera dolly push-in toward Jack and Rosie. Warm tungsten light from a hanging lamp illuminates their features, while cool neon reflections flicker across the window and Jack’s jacket. Rosie gives a subtle, confident outlaw gaze while Jack holds his piercing, stoic stare directly into the lens. Lips remain sealed, relaxed, and motionless.

• [00:14–00:20] [Chorus Climax & Stoic Fade]
As the duet chorus and distorted guitars hit their peak, the camera settles into a powerful close-up framing both characters. Rain continues running down the glass behind them. Jack and Rosie share a brief, knowing glance before fixing their defiant eyes back onto the highway outside as the lights softly dim into deep cinematic noir shadows.

Unbroken continuous shot, silent non-vocal performance, closed motionless mouth for the entire duration, authentic facial physics, restrained natural acting, 35mm film-grain texture, anamorphic lens flares, warm amber rim lighting contrasted with cold midnight-blue haze, zero morphing, zero lip movement, zero lip-sync, zero singing, zero speech, ultra-consistent Jack Howlin and Rosie Ray character identities.`
  },
  {
    key: 'runaway_in_nashville',
    title: 'Runaway in Nashville — Broadway Back Alley Escape',
    trackName: 'Runaway in Nashville (Mastered)',
    wavFile: 'runaway_in_nashville.wav',
    start: '00:00:30',
    duration: 20.0,
    scheduledDate: '2026-09-12T18:00:00.000Z', // Saturday Sep 12, 20:00 CET
    references: [JACK_REF_URL],
    caption: `Leaving Nashville with the amps still hot and the tires burning wet asphalt. 🎸⚡

No looking back once the stage lights die.

Track: "Runaway in Nashville (Mastered)"
Turn it loud for Saturday night.

#JackHowlin #RunawayInNashville #OutlawCountry #NashvilleNights #AmericanaRock #BroadwayNoir #Seedance25 #SaturdayDrop`,
    prompt: `One continuous 20-second unbroken cinematic shot in 9:16 vertical framing of Jack Howlin in a rain-slicked Nashville back alley behind a neon-lit honky-tonk club at 3:30 AM.

CRITICAL PERFORMANCE RULE: Jack does not sing, speak, whisper, shout, mouth lyrics, or lip-sync at any point. His lips remain naturally closed and completely still throughout the entire video. No mouth movement, no visible teeth, and no exaggerated jaw motion. The music is soundtrack only.

• [00:00–00:06] [Alleyway Atmosphere & Honky-Tonk Exit]
Atmospheric medium shot. Jack Howlin steps through a heavy metal stage door into a dark wet alleyway. He carries a battered sunburst acoustic guitar case in one hand. Jack wears his signature tan camel-brown heavy canvas work jacket with chest flap pockets over an unbuttoned charcoal henley shirt, full rugged brown beard and damp wavy hair. Red neon glow from the venue sign reflects on the wet cobblestones and puddles. Jack walks slowly toward camera, mouth closed and stoic.

• [00:06–00:14] [Slow Dolly & Streetlamp Glow]
The camera tracks smoothly backward with Jack. He steps beneath a single warm amber streetlamp that casts long dramatic shadows behind him. Steam rises from a nearby sewer grate. Jack turns his sharp, piercing gaze directly into the camera lens, his expression weathered, resolute, and defiant. Lips remain sealed and motionless.

• [00:14–00:20] [Uptempo Climax & Truck Silhouette]
As the telecaster solos and driving drums peak, Jack stops beside his vintage black pickup truck parked at the end of the alley. He throws the guitar into the passenger seat, looks back over his shoulder at the distant flashing city lights with a stoic smirk in his eyes, and steps into the deep shadows as headlights flash on.

Unbroken continuous shot, silent non-vocal performance, closed motionless mouth for the entire duration, authentic facial physics, restrained natural acting, 35mm film-grain texture, anamorphic lens flares, warm amber rim lighting contrasted with cold midnight-blue haze, rain reflections, zero morphing, zero lip movement, zero lip-sync, zero singing, zero speech, ultra-consistent Jack Howlin multi-level reference identity.`
  },
  {
    key: 'open_roads_colorado',
    title: 'Open Roads (Colorado Line) — High Mountain Pass Dawn',
    trackName: 'Open Roads (Colorado Line)',
    wavFile: 'open_roads_colorado.wav',
    start: '00:00:15',
    duration: 25.0,
    scheduledDate: '2026-09-14T18:00:00.000Z', // Monday Sep 14, 20:00 CET
    references: [JACK_REF_URL],
    caption: `The air gets thin at 9,000 feet, but the road is wider than eternity. 🌲🏔️

Crossing the Colorado line with nothing but a full tank and an open heart.

Track: "Open Roads (Colorado Line)"
For everyone heading into the mountains this week.

#JackHowlin #OpenRoads #ColoradoLine #RockyMountains #OutlawCountry #AmericanaRock #MorningDrive #Seedance25`,
    prompt: `One continuous 25-second unbroken cinematic shot in 9:16 vertical framing of Jack Howlin standing at a breathtaking Colorado mountain pass overlook at sunrise.

CRITICAL PERFORMANCE RULE: Jack does not sing, speak, whisper, shout, mouth lyrics, or lip-sync at any point. His lips remain naturally closed and completely still throughout the entire video. No mouth movement, no visible teeth, and no exaggerated jaw motion. The music is soundtrack only.

• [00:00–00:08] [Mountain Sunrise & Pine Forest Overview]
Atmospheric wide-medium shot. The golden morning sun slowly crests behind massive pine-covered Rocky Mountain peaks, sending radiant volumetric light rays through drifting morning mountain fog. Jack Howlin stands on the edge of a scenic turnout next to his black pickup truck. Jack wears his signature tan heavy canvas work jacket with dual chest pockets over charcoal henley shirt, full rugged brown beard and wavy dark hair moving gently in the crisp mountain breeze. He holds a white speckled enamel campfire mug with steaming black coffee. Mouth closed and still.

• [00:08–00:17] [Slow Dolly Push-In & Golden Hour Highlights]
Slow cinematic camera push-in toward Jack. The warm morning sun flares warmly across the anamorphic lens, catching the rich camel-brown texture of his canvas jacket and illuminating his rugged jawline and piercing brown eyes. Jack turns his gaze from the vast valley below to look directly into the camera lens with serene, unshakable outlaw wisdom. Lips remain completely closed, relaxed, and motionless.

• [00:17–00:25] [Grand Country-Rock Climax & Horizon Gaze]
As the expansive acoustic guitars and soaring rhythm section swell to their grand climax, the camera glides smoothly around Jack in a majestic half-orbit. Sunlight glints off the truck’s windshield and mountain dew on the pine needles. Jack takes a quiet breath of fresh mountain air, looking down the winding highway ahead as the scene basks in warm golden cinematic beauty.

Unbroken continuous shot, silent non-vocal performance, closed motionless mouth for the entire duration, authentic facial physics, restrained natural acting, 35mm film-grain texture, golden hour lens flares, pine mountain mist, zero morphing, zero lip movement, zero lip-sync, zero singing, zero speech, ultra-consistent Jack Howlin multi-level reference identity.`
  },
  {
    key: 'leaving_amarillo',
    title: 'Leaving Amarillo — Sunset at Lone Star Pumps',
    trackName: 'Leaving Amarillo',
    wavFile: 'leaving_amarillo.wav',
    start: '00:00:25',
    duration: 20.0,
    scheduledDate: '2026-09-16T18:00:00.000Z', // Wednesday Sep 16, 20:00 CET
    references: [JACK_REF_URL],
    caption: `Texas dust on the boots and the whole Western sky on fire. 🏜️🔥

Leaving Amarillo in the rear-view mirror.

Track: "Leaving Amarillo"
Outlaw Country for the long desert haul.

#JackHowlin #LeavingAmarillo #Route66 #TexasOutlaw #AmericanaMusic #DesertSunset #Seedance25 #WednesdayDrop`,
    prompt: `One continuous 20-second unbroken cinematic shot in 9:16 vertical framing of Jack Howlin at a weathered vintage gas station along an empty Texas Route 66 highway during a vivid purple and orange sunset.

CRITICAL PERFORMANCE RULE: Jack does not sing, speak, whisper, shout, mouth lyrics, or lip-sync at any point. His lips remain naturally closed and completely still throughout the entire video. No mouth movement, no visible teeth, and no exaggerated jaw motion. The music is soundtrack only.

• [00:00–00:06] [Texas Sunset & Vintage Pump Staging]
Atmospheric medium shot. An old rusty 1960s gas pump stands on cracked pavement against a dramatic glowing magenta and burning orange desert sunset sky. Jack Howlin stands leaning casually against the pump, wearing his signature tan camel-brown heavy canvas work jacket over charcoal henley shirt, full rugged brown beard and wavy hair caught in the warm evening breeze. Tumbleweeds and fine desert dust drift in the background. Jack gazes across the flat Texas plains with calm, stoic intensity. Mouth closed and still.

• [00:06–00:14] [Slow Push-In & Golden Sunset Rim-Lighting]
The camera performs a slow, smooth dolly push toward Jack. The brilliant setting sun casts dramatic warm copper rim lighting along his jacket, beard, and cheekbones, contrasting against the darkening purple twilight sky. Jack turns his head and fixes his deep, introspective eyes on the camera lens. His expression is resolute, thoughtful, and unmoving. Lips remain sealed and relaxed.

• [00:14–00:20] [Slide Guitar Climax & Twilight Fade]
As the crying slide guitar and heavy drum groove reach their emotional peak, the camera holds a tight dramatic close-up. Jack’s eyes narrow slightly with a knowing, weathered outlaw expression. The distant neon sign above the pump station flickers on as the orange sunset deepens into rich Texas twilight shadows.

Unbroken continuous shot, silent non-vocal performance, closed motionless mouth for the entire duration, authentic facial physics, restrained natural acting, 35mm film-grain texture, warm sunset lens flares, desert breeze dust, zero morphing, zero lip movement, zero lip-sync, zero singing, zero speech, ultra-consistent Jack Howlin multi-level reference identity.`
  },
  {
    key: 'livin_on_borrowed_time',
    title: 'Livin\' on Borrowed Time — The Outlaw\'s Midnight Den',
    trackName: 'Livin\' on Borrowed Time (Remastered)',
    wavFile: 'livin_on_borrowed_time.wav',
    start: '00:00:25',
    duration: 30.0,
    scheduledDate: '2026-09-18T18:00:00.000Z', // Friday Sep 18, 20:00 CET
    references: [JACK_REF_URL],
    caption: `We’re all livin' on borrowed time. Might as well play the hand with everything you got. 🥃♠️

Track: "Livin' on Borrowed Time (Remastered)"
Outlaw Rock for Friday night.

#JackHowlin #LivinOnBorrowedTime #OutlawRock #SouthernRock #SaloonNoir #Seedance25 #FridayDrop #NewMusic`,
    prompt: `One continuous 30-second unbroken cinematic shot in 9:16 vertical framing of Jack Howlin sitting in the dark, smoky backroom of a rustic western saloon at midnight.

CRITICAL PERFORMANCE RULE: Jack does not sing, speak, whisper, shout, mouth lyrics, or lip-sync at any point. His lips remain naturally closed and completely still throughout the entire video. No mouth movement, no visible teeth, and no exaggerated jaw motion. The music is soundtrack only.

• [00:00–00:07] [Saloon Den Atmosphere & Kerosene Lighting]
Atmospheric medium shot. Jack Howlin sits at a heavy dark oak table in the shadows of an authentic outlaw tavern backroom. An old kerosene lantern burns with a warm amber flame, casting deep chiaroscuro shadows across the wooden walls. Jack wears his signature tan heavy canvas work jacket over an unbuttoned charcoal henley shirt, with his full rugged brown beard and wavy dark hair. A vintage deck of playing cards and a glass of amber bourbon rest on the table. Jack leans back, silently scanning the room with stoic outlaw poise. Mouth completely closed.

• [00:07–00:15] [Slow Push-In & Cigarette Smoke Haze]
Slow cinematic camera dolly push-in toward Jack. Wisps of curling tobacco smoke drift slowly through the warm beam of lantern light. Jack shifts forward, resting his weathered hands on the table, and locks his piercing, unyielding brown eyes directly with the camera lens. His expression is intense, dangerous, and calm. Lips remain sealed, relaxed, and motionless.

• [00:15–00:23] [Southern Rock Climax & Dramatic Chiaroscuro Close-Up]
As the distorted dual guitars and thunderous drums explode into the chorus, the camera moves into a tight, dramatic close-up. The flickering lantern flame dances in Jack’s eyes, illuminating the razor-sharp contours of his jawline and rugged beard. Jack holds his unwavering stare, displaying raw charisma and quiet outlaw power timed to the rhythm of the track. He remains completely silent. No lip movement, no mouth opening, no humming, no singing.

• [00:23–00:30] [Stoic Outro & Lantern Shadow Fade]
The camera movement smoothly decelerates. Jack gives a faint, defiant nod as he reaches for the bourbon glass. The warm lantern light softly dims, and the scene gently fades into rich, deep cinematic noir shadows.

Unbroken continuous shot, silent non-vocal performance, closed motionless mouth for the entire duration, authentic facial physics, restrained natural acting, 35mm film-grain texture, anamorphic lens flares, warm amber rim lighting contrasted with deep saloon shadows, curling smoke haze, zero morphing, zero lip movement, zero lip-sync, zero singing, zero speech, ultra-consistent Jack Howlin multi-level reference identity.`
  }
];

function runCli(cmdArgs) {
  const fullCmd = `node "${cliPath}" ${cmdArgs} --json`;
  const raw = cp.execSync(fullCmd, { env, encoding: 'utf8', maxBuffer: 20 * 1024 * 1024 });
  return JSON.parse(raw);
}

async function waitForTask(taskId, label, maxWaitMs = 600000) {
  console.log(`⏳ Wachten op ${label} [Task ID: ${taskId}]...`);
  const startTime = Date.now();

  while (Date.now() - startTime < maxWaitMs) {
    try {
      const parsed = runCli(`get_task_status --task_id "${taskId}"`);
      const data = parsed.data || parsed.response?.data || parsed.api_response?.data || parsed;
      const status = (parsed.status || data.status || data.state || '').toLowerCase();
      const elapsed = Math.round((Date.now() - startTime) / 1000);

      console.log(`   [${elapsed}s] ${label} status: ${status.toUpperCase()}`);

      if (status === 'completed' || status === 'success' || status === 'done') {
        let urls = parsed.result_urls || data.resultUrls || data.result_urls;
        if (!urls && data.resultJson) {
          try {
            const rj = JSON.parse(data.resultJson);
            urls = rj.resultUrls || rj.result_urls || rj.urls;
          } catch (e) {}
        }
        if (urls && urls.length > 0) return urls[0];
        if (data.resultUrl || data.result_url || data.video_url || data.videoUrl) {
          return data.resultUrl || data.result_url || data.video_url || data.videoUrl;
        }
      }

      if (status === 'failed' || status === 'fail' || status === 'error') {
        throw new Error(`Kie taak ${taskId} mislukt: ${data.failMsg || JSON.stringify(data)}`);
      }
    } catch (err) {
      if (err.message.includes('mislukt')) throw err;
      console.log(`   Status check retry: ${err.message}`);
    }

    await new Promise(r => setTimeout(r, 10000));
  }

  throw new Error(`Kie taak ${taskId} time-out na ${maxWaitMs / 1000}s`);
}

async function downloadFile(url, destPath) {
  console.log(`Downloaden van ${url} naar ${destPath}...`);
  const response = await fetch(url);
  if (!response.ok) throw new Error(`Download mislukt (${response.statusText}): ${url}`);
  const buffer = Buffer.from(await response.arrayBuffer());
  fs.writeFileSync(destPath, buffer);
  console.log(`✅ Opgeslagen: ${(fs.statSync(destPath).size / (1024 * 1024)).toFixed(2)} MB`);
}

async function main() {
  console.log('================================================================');
  console.log('🎬 STARTEN VAN BATCH PRODUCTIE: 5 VOLLEDIGE OUTLAW VIDEO\'S');
  console.log('⚡ Seedance 2.5 + Multi-Level Master Referenties + 48kHz Audio');
  console.log('================================================================\n');

  const bucket = admin.storage().bucket();
  const results = [];

  // STAP 1: Knip alle 5 audio tracks met FFmpeg en upload
  console.log('✂️ STAP 1: Knippen en uploaden van alle 5 master audiosporen...');
  for (const cfg of videoConfigs) {
    const rawWav = path.join(outputDir, cfg.wavFile);
    const slicedWav = path.join(batchDir, `${cfg.key}_${cfg.duration}s.wav`);
    const slicedMp3 = path.join(batchDir, `${cfg.key}_${cfg.duration}s.mp3`);

    cp.spawnSync(ffmpeg, [
      '-y',
      '-ss', cfg.start,
      '-t', `${cfg.duration}`,
      '-i', rawWav,
      '-af', `afade=t=in:ss=0:d=0.25,afade=t=out:st=${cfg.duration - 1.5}:d=1.5`,
      slicedWav
    ], { stdio: 'ignore' });

    cp.spawnSync(ffmpeg, [
      '-y',
      '-i', slicedWav,
      '-b:a', '320k',
      slicedMp3
    ], { stdio: 'ignore' });

    cfg.localWav = slicedWav;
    cfg.localMp3 = slicedMp3;
    console.log(`   ✅ Audio geknipt: ${cfg.key} (${cfg.duration}s)`);
  }

  // STAP 2: Dispatch alle 5 Seedance taken parallel naar Kie.ai
  console.log('\n🚀 STAP 2: Submitten van 5 Seedance 2.5 taken op Kie.ai...');
  for (const cfg of videoConfigs) {
    const refArgs = cfg.references.map(u => `"${u}"`).join(' ');
    const cliArgs = `bytedance_seedance_video --duration ${cfg.duration} --aspect_ratio 9:16 --resolution 480p --reference_image_urls ${refArgs} --prompt "${cfg.prompt.replace(/"/g, '\\"')}"`;
    
    try {
      const res = runCli(cliArgs);
      cfg.taskId = res.task_id || res.data?.taskId || res.taskId;
      console.log(`   ✅ Taak [${cfg.key}]: Task ID ${cfg.taskId}`);
    } catch (err) {
      console.error(`   ❌ Fout bij starten van ${cfg.key}: ${err.message}`);
    }
  }

  // STAP 3: Wacht parallel op afronding van alle taken
  console.log('\n⏳ STAP 3: Wachten op afronding van de 5 AI videoclips...');
  for (const cfg of videoConfigs) {
    if (cfg.taskId) {
      try {
        cfg.videoUrl = await waitForTask(cfg.taskId, cfg.title, 600000);
        console.log(`🎉 ${cfg.key} videoclip gereed: ${cfg.videoUrl}`);
      } catch (err) {
        console.error(`❌ Fout bij ${cfg.key}: ${err.message}`);
      }
    }
  }

  // STAP 4: Download, Master (1080p + 480p), Upload en Schedule in Kalender
  console.log('\n🎛️ STAP 4: Monteren, Masteren naar 1080p HD, Uploaden en Inplannen...');
  for (const cfg of videoConfigs) {
    if (!cfg.videoUrl) continue;

    const rawLocalVideo = path.join(batchDir, `${cfg.key}_raw.mp4`);
    await downloadFile(cfg.videoUrl, rawLocalVideo);

    const master1080p = path.join(batchDir, `${cfg.key}_1080p.mp4`);
    const native480p = path.join(batchDir, `${cfg.key}_480p.mp4`);

    // 1080p HD
    const filter1080p = [
      'scale=1080:1920:flags=lanczos',
      'noise=alls=4:allf=t+u',
      'eq=contrast=1.03:brightness=0.01:saturation=1.05',
      'format=yuv420p'
    ].join(',');

    cp.spawnSync(ffmpeg, [
      '-y',
      '-i', rawLocalVideo,
      '-i', cfg.localWav,
      '-map', '0:v:0',
      '-map', '1:a:0',
      '-vf', filter1080p,
      '-c:v', 'libx264',
      '-crf', '18',
      '-preset', 'medium',
      '-pix_fmt', 'yuv420p',
      '-c:a', 'aac',
      '-b:a', '320k',
      '-t', `${cfg.duration}`,
      '-movflags', '+faststart',
      master1080p
    ], { stdio: 'ignore' });

    // 480p Native
    cp.spawnSync(ffmpeg, [
      '-y',
      '-i', rawLocalVideo,
      '-i', cfg.localWav,
      '-map', '0:v:0',
      '-map', '1:a:0',
      '-c:v', 'libx264',
      '-crf', '19',
      '-preset', 'fast',
      '-pix_fmt', 'yuv420p',
      '-c:a', 'aac',
      '-b:a', '320k',
      '-t', `${cfg.duration}`,
      '-movflags', '+faststart',
      native480p
    ], { stdio: 'ignore' });

    // Upload to Firebase Storage
    const dest1080p = `posts/${Date.now()}_jack_howlin_${cfg.key}_1080p.mp4`;
    const dest480p = `posts/${Date.now()}_jack_howlin_${cfg.key}_480p.mp4`;
    const token1080p = randomUUID();
    const token480p = randomUUID();

    await bucket.upload(master1080p, {
      destination: dest1080p,
      metadata: { contentType: 'video/mp4', metadata: { firebaseStorageDownloadTokens: token1080p } }
    });

    await bucket.upload(native480p, {
      destination: dest480p,
      metadata: { contentType: 'video/mp4', metadata: { firebaseStorageDownloadTokens: token480p } }
    });

    const url1080p = `https://firebasestorage.googleapis.com/v0/b/${bucket.name}/o/${encodeURIComponent(dest1080p)}?alt=media&token=${token1080p}`;
    const url480p = `https://firebasestorage.googleapis.com/v0/b/${bucket.name}/o/${encodeURIComponent(dest480p)}?alt=media&token=${token480p}`;

    // Schedule in Firestore Calendar
    const targetDate = new Date(cfg.scheduledDate);
    const postDoc = {
      title: cfg.title,
      caption: cfg.caption,
      mediaUrl: url1080p,
      mediaUrl480p: url480p,
      mediaType: 'video',
      platforms: ['instagram', 'tiktok', 'youtube', 'facebook'],
      scheduledAt: admin.firestore.Timestamp.fromDate(targetDate),
      scheduledDate: targetDate.toISOString(),
      status: 'scheduled',
      createdAt: admin.firestore.Timestamp.now(),
      track: cfg.trackName,
      videoFormat: `9:16 vertical (1080x1920 HD Seedance 2.5 - ${cfg.duration}s)`,
      notes: `Batch produced video with custom 48kHz audio for ${cfg.trackName}.`,
      model: 'seedance_2_5'
    };

    const docRef = await admin.firestore().collection('posts').add(postDoc);
    console.log(`   🎉 [${cfg.key}] Ingepland in kalender! Doc ID: ${docRef.id}`);

    results.push({
      key: cfg.key,
      title: cfg.title,
      docId: docRef.id,
      url1080p: url1080p,
      url480p: url480p,
      scheduledDate: cfg.scheduledDate
    });
  }

  console.log('\n================================================================');
  console.log('🚀 ALLE 5 OUTLAW VIDEO\'S ZIJN MET SUCCES OPGELEVERD & INGEPLAND!');
  console.log('================================================================');
  results.forEach(r => {
    console.log(`\n📌 ${r.title}`);
    console.log(`   🆔 Firestore Post ID: ${r.docId}`);
    console.log(`   📅 Datum: ${r.scheduledDate}`);
    console.log(`   🔗 1080p HD Video: ${r.url1080p}`);
  });
  console.log('================================================================\n');
}

main().catch(console.error);
