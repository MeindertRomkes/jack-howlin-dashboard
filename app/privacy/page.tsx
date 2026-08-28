export default function PrivacyPage() {
  return (
    <div className="max-w-2xl mx-auto px-6 py-12 text-stone-300">
      <h1 className="text-2xl font-bold text-white mb-6">Privacy Policy</h1>
      <p className="text-stone-500 text-sm mb-8">Last updated: {new Date().getFullYear()}</p>

      <section className="mb-6">
        <h2 className="text-lg font-semibold text-white mb-2">1. Overview</h2>
        <p>This is a private dashboard used exclusively by Jack Howlin&apos; (Meindert Romkes) to schedule and publish social media content. No data is collected from third-party users.</p>
      </section>

      <section className="mb-6">
        <h2 className="text-lg font-semibold text-white mb-2">2. Data We Collect</h2>
        <ul className="list-disc list-inside space-y-1">
          <li>Authentication data (Firebase Auth) for the dashboard owner</li>
          <li>Social media access tokens for platform integrations (stored encrypted in Google Cloud Secret Manager)</li>
          <li>Scheduled posts and media files (stored in Firebase Firestore and Firebase Storage)</li>
          <li>YouTube comments fetched for moderation purposes</li>
        </ul>
      </section>

      <section className="mb-6">
        <h2 className="text-lg font-semibold text-white mb-2">3. TikTok Data</h2>
        <p>This app uses the TikTok Content Posting API solely to publish videos on behalf of the account owner. We do not collect, store, or share any TikTok user data beyond what is necessary to authenticate and publish content. TikTok access tokens are stored securely and never shared with third parties.</p>
      </section>

      <section className="mb-6">
        <h2 className="text-lg font-semibold text-white mb-2">4. Data Sharing</h2>
        <p>We do not sell, share, or disclose any data to third parties. Platform integrations (YouTube, Instagram, TikTok, Facebook) are governed by their respective privacy policies.</p>
      </section>

      <section className="mb-6">
        <h2 className="text-lg font-semibold text-white mb-2">5. Data Retention</h2>
        <p>Data is retained as long as the service is active. You can request deletion at any time by contacting us.</p>
      </section>

      <section>
        <h2 className="text-lg font-semibold text-white mb-2">6. Contact</h2>
        <p>For privacy questions: romkesmeindert@gmail.com</p>
      </section>
    </div>
  )
}
