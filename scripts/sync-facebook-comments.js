const https = require('https');
const admin = require('firebase-admin');

if (!admin.apps.length) {
  admin.initializeApp({
    projectId: 'jack-howlin-dashboard',
    storageBucket: 'jack-howlin-dashboard.firebasestorage.app'
  });
}

const db = admin.firestore();
const pageId = '1255894134276290';
const token = 'EAA7ua8O7GewBSdTZCgr6oGIJaUhjaIMxEQMTPQomc2CpbVQZCZChZBH1RQqmNZBHiZBM7IB6kPDyklNyfqPhLm0CLmhG2Y9ZAFGIW9IXzg84SDUj5D2wEHmM4PJVZBGUXTTzwCK9MhPngIU9ex5XnKFHoUTCgtz1BUIwdglk0zZCIYRV3slFn92vcuMwRZBLfgQBgeuPvjZBxbeiqCVisAzLHAhO6uU8sTwzlfoAGsF6rcZD';
const BASE = 'https://graph.facebook.com/v21.0';

function fetchJson(url) {
  return new Promise((resolve, reject) => {
    https.get(url, res => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => resolve(JSON.parse(data || '{}')));
    }).on('error', reject);
  });
}

async function syncFacebook() {
  console.log('Fetching Facebook Page posts and videos...');

  // 1. Fetch Page feed / posts
  const postsUrl = `${BASE}/${pageId}/posts?fields=id,message,permalink_url,created_time&limit=25&access_token=${token}`;
  const postsData = await fetchJson(postsUrl);
  console.log('Found posts:', postsData.data?.length || 0);

  // 2. Fetch Page videos
  const videosUrl = `${BASE}/${pageId}/videos?fields=id,description,title,permalink_url,created_time&limit=25&access_token=${token}`;
  const videosData = await fetchJson(videosUrl);
  console.log('Found videos:', videosData.data?.length || 0);

  let totalCommentsSaved = 0;

  const allItems = [
    ...(postsData.data || []).map(p => ({ id: p.id, title: p.message, url: p.permalink_url, time: p.created_time, type: 'post' })),
    ...(videosData.data || []).map(v => ({ id: v.id, title: v.description || v.title, url: v.permalink_url, time: v.created_time, type: 'video' }))
  ];

  for (const item of allItems) {
    const commentsUrl = `${BASE}/${item.id}/comments?fields=id,message,from,like_count,created_time,comments{id,message,from}&limit=50&access_token=${token}`;
    const commentsData = await fetchJson(commentsUrl);

    for (const comment of (commentsData.data || [])) {
      if (comment.from?.id === pageId || comment.from?.name?.toLowerCase() === "jack howlin'") continue;

      const subComments = comment.comments?.data || [];
      const creatorReplies = subComments
        .filter(r => r.from?.id === pageId || r.from?.name?.toLowerCase() === "jack howlin'")
        .map(r => r.message);
      const isRepliedByCreator = creatorReplies.length > 0;
      const commentDate = new Date(comment.created_time);

      const existing = await db.collection('comments').where('platformCommentId', '==', comment.id).limit(1).get();

      const commentDoc = {
        platform: 'facebook',
        platformCommentId: comment.id,
        videoId: item.id,
        videoTitle: item.title ? (item.title.substring(0, 75) + '...') : 'Facebook Post',
        sourceUrl: item.url || `https://www.facebook.com/${item.id}`,
        sourceType: item.type === 'video' ? 'video' : 'post',
        author: comment.from?.name || 'Facebook Fan',
        authorAvatar: '',
        text: comment.message,
        publishedAt: admin.firestore.Timestamp.fromDate(commentDate),
        fetchedAt: admin.firestore.Timestamp.now(),
        status: isRepliedByCreator ? 'replied' : 'new',
        generatedReplies: [],
        chosenReply: isRepliedByCreator ? creatorReplies[0] : null,
        likeCount: comment.like_count || 0,
        isLikedByCreator: false,
        isRepliedByCreator,
        creatorReplies,
        replyCount: subComments.length
      };

      if (!existing.empty) {
        await db.collection('comments').doc(existing.docs[0].id).update(commentDoc);
      } else {
        await db.collection('comments').add(commentDoc);
      }

      totalCommentsSaved++;
      console.log('Saved Facebook comment from:', comment.from?.name, '->', comment.message);
    }
  }

  console.log('Facebook sync complete! Total comments processed:', totalCommentsSaved);
}

syncFacebook().catch(console.error);
