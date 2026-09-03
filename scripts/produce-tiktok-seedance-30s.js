const { spawn } = require('child_process');
const path = require('path');
const fs = require('fs');
const dotenv = require('dotenv');

dotenv.config({ path: '.env.local' });
dotenv.config();

const KIE_API_KEY = process.env.KIE_AI_API_KEY || '10e19446174f4f74a4237b3bce6a8863';
const rootDir = process.cwd();

const refManifestPath = path.join(rootDir, 'projects', 'jack-core-set', 'tiktok_seedance_references.json');
const refs = JSON.parse(fs.readFileSync(refManifestPath, 'utf8'));

const image1_jack = refs.image_1_jack;
const image2_june = refs.image_2_june;
const image3_abel = refs.image_3_abel;
const image4_exterior = refs.image_4_exterior;
const image5_reception = refs.image_5_reception;
const image6_hallway = refs.image_6_hallway;
const audio1_track = refs.audio_1_exact_30s || refs.audio_1;

const fullPrompt = `Create a complete 30-second vertical cinematic neo-Western mystery short film for TikTok, presented in 9:16 framing.

Use @Audio 1 as the exact soundtrack throughout the entire film. Preserve the supplied music without changing, remixing, replacing, extending, or adding vocals. Synchronize the visual pacing, cuts, camera movements, lighting changes, and final reveal naturally to the rhythm and dynamics of @Audio 1.

IMPORTANT CHARACTER REFERENCES:

Jack Howlin’ must strictly match @Image 1 throughout the entire film: identical face, rugged full brown beard and mustache, dark wavy hair, body proportions, camel-brown heavy canvas work jacket, charcoal henley shirt, dark jeans, boots, coloring, age, and realistic skin texture.

June Holloway must strictly match @Image 2: identical face, hairstyle with visible silver strands, age, body proportions, petrol-blue and black motel-owner clothing, jewelry, colors, and restrained elegant appearance.

Abel Graves must strictly match @Image 3: identical narrow pale face, grey-green eyes, collar-length ash-brown hair, lean body, long weathered slate-grey coat, faded cream shirt, narrow faded-blue scarf, black jeans, boots, and silver pocket-watch chain.

Jack, June, and Abel are three completely separate people. Never blend, exchange, morph, or combine their faces, bodies, clothing, hairstyles, or accessories.

Use @Image 4 as the primary visual reference for the exterior architecture, motel sign, parking area, wet asphalt, fog, neon colors, and nighttime atmosphere of the Midnight Mirage Motel.

Use @Image 5 as the reference for the motel reception desk, aged wood, tarnished brass details, key rack, practical lamps, turquoise-and-red neon spill, and faded 1970s roadside-motel interior.

Use @Image 6 as the reference for the narrow motel corridor, room doors, patterned carpet, flickering ceiling lights, worn wallpaper, spatial layout, and the appearance of room 17.

VISUAL STYLE:

Highly photorealistic live-action neo-Western cinema with Southern Gothic mystery. Midnight desert atmosphere, recent rainfall, reflective black asphalt, thin low fog, subtle wind, turquoise and dark-red neon, muted camel-brown highlights around Jack, petrol-blue accents around June, and faded cold-blue accents around Abel.

Natural cinematic skin texture, physically accurate shadows, realistic fabric movement, subtle 35mm film grain, gentle anamorphic bloom around practical lights, deep blacks with preserved detail, shallow depth of field in close-ups, restrained handheld movement, and realistic motion blur.

The film must feel mysterious, melancholic, expensive, grounded, and emotionally serious—not like supernatural horror, a music video performance, or a collection of unrelated AI shots.

STORY AND CAMERA PLAN:

[00:00–00:04 — IMMEDIATE VISUAL HOOK]
Begin with an extremely low roadside camera position beside wet black asphalt at midnight.
Jack’s vintage black pickup truck rushes close past the lens, creating a fast natural foreground wipe and a spray of rainwater. The camera whip-pans smoothly with the truck as it enters the Midnight Mirage Motel parking area.
The turquoise-and-red motel sign from @Image 4 flickers to life in stages through thin drifting fog. The words “MIDNIGHT MIRAGE MOTEL” may be visible only if already present correctly in @Image 4; do not invent additional signage or random text.
The pickup stops beneath the neon glow. Reflections ripple naturally across the wet ground.
Hard musical cut into the next shot using the dark body of the truck as a full-frame transition.

[00:04–00:09 — JACK ARRIVES]
Medium-low tracking shot beside the pickup.
Jack Howlin’ exits the driver’s side and closes the door once with controlled weight. He does not rush. A cold breeze moves his dark hair and the hem of his camel-brown jacket naturally.
Jack pauses beside the truck and studies the motel. His mouth remains fully closed. His expression is serious and quietly uneasy; his eyes narrow slightly while his jaw tightens. He must not sing, speak, whistle, lip-sync, mumble, or visibly move his lips.
The camera slowly pushes closer from a medium shot to a chest-level close-up. Turquoise neon illuminates one side of his face, while a faint dark-red reflection touches the opposite cheek.
For less than one second, Abel’s slender silhouette is visible standing motionless behind an upstairs window. Jack does not clearly see him. Abel must appear fully human, solid, and naturally lit—not transparent or ghostlike.
Use Jack’s shoulder crossing close to the lens as the transition into the reception.

[00:09–00:15 — THE KEY TO ROOM 17]
Interior motel reception based on @Image 5.
Begin with a tight insert shot of June Holloway’s hand calmly placing an old brass room key onto the scratched wooden counter. The key has a heavy worn tag displaying only the number “17”. The number must be clean, readable, correctly formed, and shown only once.
Pull back into a restrained medium two-shot of June behind the counter and Jack standing opposite her.
June looks directly at Jack with calm recognition, as though she expected him. Her mouth remains closed. She gives no theatrical smile; only one eyebrow rises almost imperceptibly.
Jack looks down at the key, then back at June. His shoulders become slightly more rigid. He does not touch June. He slowly takes the key using one natural hand movement with correct finger anatomy.
Neither character speaks or lip-syncs. No dialogue, no newly generated voices, no subtitles, and no explanatory text.
As Jack lifts the key, let the brass tag briefly fill the frame and use its dark reverse side as a match-cut into the motel corridor.

[00:15–00:22 — THE CORRIDOR]
A smooth rear tracking shot follows Jack walking alone through the narrow corridor based on @Image 6.
Jack walks slowly and deliberately toward room 17. Maintain his exact clothing, hair, face, body shape, and key position. The key remains in his right hand. His left hand hangs naturally beside him.
The ceiling lights flicker sequentially farther down the corridor, never as a chaotic horror strobe.
At approximately 00:18, reveal Abel Graves standing completely still at the far end of the corridor beneath one cold overhead light. Abel faces Jack from a distance. His mouth is closed, his arms hang loosely, and his expression is quiet, distant, and almost sad.
Jack stops walking. He does not make an exaggerated frightened reaction. He only lifts his chin slightly, fixes his eyes on Abel, and tightens his grip on the room key.
A passing electrical flicker darkens the corridor for less than half a second. When the light returns, Abel is simply no longer there. No smoke, particles, distortion, teleportation glow, transparent body, jump scare, or supernatural visual effect.
Jack remains still for one beat, then turns his eyes toward the nearby door marked 17.
The camera arcs naturally from behind Jack toward his right side, ending in a close-up of his hand inserting the key.

[00:22–00:27 — INSIDE ROOM 17]
Jack opens the door slowly and enters room 17. The camera follows closely over his shoulder in one smooth motion.
The room is dim and apparently empty: an old neatly made bed, faded curtains moving slightly in the draft, a small bedside lamp, a cracked rectangular mirror, and cold neon leaking through venetian blinds.
Jack takes two slow steps inside. He keeps his mouth closed and scans the room with controlled unease.
On the bed lies an old silver pocket watch identical to Abel’s pocket watch from @Image 3. The watch is the only unexplained object. Do not add photographs, weapons, blood, letters, symbols, or additional props.
Jack notices the pocket watch. His expression shifts subtly from suspicion to recognition. His eyes soften for a fraction of a second, while his jaw remains tense.
The camera moves from the pocket watch upward toward the cracked mirror, naturally revealing Jack’s reflection.

[00:27–00:30 — MIRROR REVEAL AND FINAL IMAGE]
In the mirror only, Abel is now standing several feet behind Jack, fully solid and naturally integrated into the room’s lighting. He is not touching Jack. His faded-blue scarf and pale face are clearly recognizable.
Jack sees Abel’s reflection. His breathing pauses, but he makes no large movement and does not open his mouth.
Jack turns quickly but realistically toward the space behind him.
The room is empty.
Immediately cut on the strongest final musical beat to an exterior wide shot of the Midnight Mirage Motel. The neon sign buzzes and one turquoise letter briefly goes dark. Jack’s pickup remains parked outside beneath the rain.
Hold this final atmospheric image for the last fraction of a second, then cut cleanly to black.

PERFORMANCE DIRECTION:
Jack communicates only through restrained eye movement, jaw tension, posture, breathing, and small changes in focus. He never performs toward the camera.
June is controlled, observant, and unsurprised. Her power comes from stillness.
Abel is fully human in appearance. He is unsettling only because of his silence, timing, and impossible placement. He never smiles broadly, attacks, floats, glitches, or behaves like a horror monster.

CONTINUITY REQUIREMENTS:
Maintain exact character identity and wardrobe across every shot.
Maintain the same nighttime weather, neon palette, motel architecture, and spatial geography.
Jack’s jacket must remain camel brown in all lighting.
Abel’s scarf must remain faded blue.
June must remain behind the reception desk.
The room key must remain the same object from reception through the corridor.
The motel must feel like one connected physical location.
Use smooth motivated transitions: truck wipe, shoulder wipe, key-tag match cut, tracking arc, and final musical cut.
Every physical action must follow realistic weight, momentum, anatomy, lighting, and environmental interaction.

AUDIO RULES:
Use only @Audio 1 as the musical soundtrack.
Keep the soundtrack dominant and unchanged.
Allow only very subtle diegetic sounds beneath the music: passing truck tires on wet asphalt, one truck door closing, faint neon buzz, soft motel electrical hum, footsteps, key touching wood, lock turning, door hinge, and quiet room ambience.
No dialogue. No narration. No singing. No lip-syncing. No added lyrics. No artificial trailer impacts that overpower the supplied song.

NEGATIVE INSTRUCTIONS:
No character morphing. No face changes. No identity swapping. No inconsistent beard, hair, clothing, age, or body proportions. No duplicate characters. No duplicate limbs. No extra fingers. No malformed hands. No floating objects. No changing key design. No random room numbers. No misspelled text. No subtitles. No captions. No logos or watermarks. No visible camera crew. No guitar. No microphone. No stage performance. No cowboy hat. No gunfight. No weapon. No violence. No blood. No screaming. No open-mouth acting. No talking. No singing. No lip movement. No exaggerated horror. No ghost transparency. No glowing eyes. No smoke apparition. No demonic imagery. No surreal warping. No sudden wardrobe changes. No daylight. No scene that visually contradicts the supplied references.`;

async function main() {
  console.log('================================================================');
  console.log('🎬 SUBMITTING 30-SECOND SEEDANCE 2.5 TIKTOK SHORT FILM (FULL 30S)');
  console.log('================================================================\n');

  console.log('Audio 1 (Full 30s Master):', audio1_track);
  console.log('Duration: 30 seconds');

  const cliBin = path.join(rootDir, 'node_modules', '@felores', 'kie-cli', 'dist', 'index.js');

  const args = [
    cliBin,
    'bytedance_seedance_video',
    '--prompt', fullPrompt,
    '--reference_image_urls',
    image1_jack,
    image2_june,
    image3_abel,
    image4_exterior,
    image5_reception,
    image6_hallway,
    '--reference_audio_urls',
    audio1_track,
    '--duration', '30',
    '--resolution', '720p',
    '--aspect_ratio', '9:16',
    '--json'
  ];

  console.log('Spawning Node with kie-cli args for 30s video...');

  const child = spawn(process.execPath, args, {
    env: { ...process.env, KIE_AI_API_KEY: KIE_API_KEY },
    stdio: ['ignore', 'pipe', 'pipe']
  });

  let stdoutData = '';
  let stderrData = '';

  child.stdout.on('data', (d) => {
    stdoutData += d.toString();
  });

  child.stderr.on('data', (d) => {
    stderrData += d.toString();
  });

  child.on('close', (code) => {
    console.log(`Process exited with code ${code}`);
    console.log('STDOUT:\n', stdoutData);
    if (stderrData) console.error('STDERR:\n', stderrData);

    try {
      const parsed = JSON.parse(stdoutData.trim());
      const taskId = parsed.taskId || parsed.task_id || parsed.id || parsed?.data?.taskId;
      if (taskId) {
        fs.writeFileSync(
          path.join(rootDir, 'projects', 'jack-core-set', 'tiktok_seedance_30s_task.json'),
          JSON.stringify({ taskId, duration: 30, status: 'PROCESSING', createdAt: new Date().toISOString() }, null, 2)
        );
        console.log(`\n🎉 30s Task registered successfully! Task ID: ${taskId}`);
      }
    } catch (e) {
      console.log('Could not parse JSON output, checking raw text for taskId...');
    }
  });
}

main().catch(console.error);
