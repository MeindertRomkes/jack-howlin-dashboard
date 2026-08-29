const { initializeApp, getApps } = require('firebase-admin/app');
const { getFirestore, Timestamp } = require('firebase-admin/firestore');
const { SecretManagerServiceClient } = require('@google-cloud/secret-manager');
const { GoogleGenerativeAI } = require('@google/generative-ai');

if (!getApps().length) {
  initializeApp({ projectId: 'jack-howlin-dashboard' });
}
const db = getFirestore();

async function run() {
  const client = new SecretManagerServiceClient();
  const [v1] = await client.accessSecretVersion({ name: 'projects/jack-howlin-dashboard/secrets/FACEBOOK_PAGE_ACCESS_TOKEN/versions/latest' });
  const [vKey] = await client.accessSecretVersion({ name: 'projects/jack-howlin-dashboard/secrets/GEMINI_API_KEY/versions/latest' });
  const pageToken = v1.payload.data.toString('utf8');
  const geminiApiKey = vKey.payload.data.toString('utf8');
  const igId = '17841477945569204';

  const genAI = new GoogleGenerativeAI(geminiApiKey);
  const model = genAI.getGenerativeModel({ model: 'gemini-2.5-flash' });

  console.log('Fetching Instagram media from Graph API...');
  const res = await fetch(`https://graph.facebook.com/v21.0/${igId}/media?fields=id,caption,permalink,media_type,timestamp,comments_count,like_count&limit=100&access_token=${pageToken}`);
  const json = await res.json();
  const mediaWithComments = (json.data || []).filter(m => m.comments_count > 0);

  let ingestedCount = 0;

  for (const m of mediaWithComments) {
    const cRes = await fetch(`https://graph.facebook.com/v21.0/${m.id}/comments?fields=id,text,username,timestamp,like_count,from,replies{id,text,username,from}&limit=50&access_token=${pageToken}`);
    const cJson = await cRes.json();
    const isReel = m.media_type === 'VIDEO';
    const sourceType = isReel ? 'reel' : 'post';
    const postTitle = m.caption ? (m.caption.substring(0, 65) + '...') : 'Instagram Reel';

    for (const comment of cJson.data || []) {
      if (comment.username?.toLowerCase() === 'jack_howlin_official') continue;

      const likeCount = comment.like_count || 0;
      const replies = comment.replies?.data || [];
      const creatorReplies = replies
        .filter(r => r.username?.toLowerCase() === 'jack_howlin_official')
        .map(r => r.text);
      const isRepliedByCreator = creatorReplies.length > 0;
      const commentDate = new Date(comment.timestamp);
      const author = `@${comment.username}`;

      // Update Fan Profile
      const fanDocId = `instagram_${author.replace(/[^a-zA-Z0-9_-]/g, '_')}`;
      const fanRef = db.collection('fans').doc(fanDocId);
      const fanSnap = await fanRef.get();
      let fanCount = 1;
      let isSuperfan = false;
      if (fanSnap.exists) {
        fanCount = (fanSnap.data().commentCount || 1) + 1;
        isSuperfan = fanCount >= 2;
        await fanRef.update({
          commentCount: fanCount,
          lastCommentAt: Timestamp.fromDate(commentDate),
          isSuperfan,
          recentComments: [comment.text, ...(fanSnap.data().recentComments || [])].slice(0, 5),
        });
      } else {
        await fanRef.set({
          author,
          platform: 'instagram',
          authorAvatar: '',
          commentCount: 1,
          firstCommentAt: Timestamp.fromDate(commentDate),
          lastCommentAt: Timestamp.fromDate(commentDate),
          isSuperfan: false,
          recentComments: [comment.text],
        });
      }

      // Check if existing in comments collection
      const existing = await db.collection('comments').where('platformCommentId', '==', comment.id).limit(1).get();
      let generatedReplies = [];

      if (!isRepliedByCreator) {
        // Generate Outlaw Americana Replies
        const prompt = `You are writing Instagram comments for Jack Howlin', an Outlaw Americana / Dark Country artist.
Voice rules: Understated power, confident, short (under 15 words), max 1 emoji, never sycophantic.
This commenter (${author}) is a Superfan from Australia who loves your music.

Generate 3 distinct reply options for this comment: "${comment.text}" on Instagram post "${postTitle}".
Return strictly a JSON array with 3 strings: ["reply1", "reply2", "reply3"]`;

        try {
          const aiRes = await model.generateContent(prompt);
          const aiText = aiRes.response.text().trim();
          const match = aiText.match(/\[[\s\S]*\]/);
          if (match) generatedReplies = JSON.parse(match[0]);
        } catch (e) {
          console.error('AI gen error:', e);
        }
      }

      const commentDoc = {
        platform: 'instagram',
        platformCommentId: comment.id,
        videoId: m.id,
        videoTitle: postTitle,
        sourceUrl: m.permalink,
        sourceType,
        author,
        authorAvatar: '',
        text: comment.text,
        publishedAt: Timestamp.fromDate(commentDate),
        fetchedAt: Timestamp.now(),
        status: isRepliedByCreator ? 'replied' : 'new',
        generatedReplies,
        chosenReply: isRepliedByCreator ? creatorReplies[0] : null,
        likeCount,
        isLikedByCreator: false,
        isRepliedByCreator,
        creatorReplies,
        replyCount: replies.length,
        isSuperfan: true,
        fanCommentCount: fanCount,
      };

      if (!existing.empty) {
        await db.collection('comments').doc(existing.docs[0].id).set(commentDoc, { merge: true });
        console.log(`Updated IG comment: ${comment.id} from ${author}`);
      } else {
        const added = await db.collection('comments').add(commentDoc);
        console.log(`Ingested new IG comment: ${added.id} from ${author}: "${comment.text}"`);
      }
      ingestedCount++;
    }
  }

  // Update sync state
  const totalSnap = await db.collection('comments').get();
  let unrepliedCount = 0;
  let repliedCount = 0;
  totalSnap.forEach(d => {
    const data = d.data();
    if (data.status === 'new' && !data.isRepliedByCreator) unrepliedCount++;
    else if (data.status === 'replied' || data.isRepliedByCreator) repliedCount++;
  });

  await db.collection('system').doc('sync_state').set({
    lastSyncAt: Timestamp.now(),
    lastSyncStatus: 'success',
    totalCommentsCount: totalSnap.size,
    unrepliedCount,
    repliedCount,
    'platforms.instagram': {
      lastSyncAt: Timestamp.now(),
      status: 'success',
      totalCount: ingestedCount,
    },
  }, { merge: true });

  console.log(`\n=== SUCCESS! Ingested ${ingestedCount} Instagram comments! Total comments in DB: ${totalSnap.size} (Unreplied: ${unrepliedCount}, Replied: ${repliedCount}) ===`);
}

run().catch(e => console.error(e));
