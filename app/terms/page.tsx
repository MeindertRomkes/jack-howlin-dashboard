export default function TermsPage() {
  return (
    <div className="max-w-2xl mx-auto px-6 py-12 text-stone-300">
      <h1 className="text-2xl font-bold text-white mb-6">Terms of Service</h1>
      <p className="text-stone-500 text-sm mb-8">Last updated: {new Date().getFullYear()}</p>

      <section className="mb-6">
        <h2 className="text-lg font-semibold text-white mb-2">1. Use of Service</h2>
        <p>This dashboard is a private tool used exclusively by Jack Howlin&apos; (Meindert Romkes) to manage and schedule social media content. Access is restricted to authorised users only.</p>
      </section>

      <section className="mb-6">
        <h2 className="text-lg font-semibold text-white mb-2">2. Third-party Platforms</h2>
        <p>This service integrates with third-party platforms including YouTube, Instagram, TikTok, and Facebook. Use of those platforms is governed by their respective terms of service.</p>
      </section>

      <section className="mb-6">
        <h2 className="text-lg font-semibold text-white mb-2">3. Content</h2>
        <p>All content published through this dashboard is the sole responsibility of the account owner. No user-generated content from third parties is published.</p>
      </section>

      <section className="mb-6">
        <h2 className="text-lg font-semibold text-white mb-2">4. Limitation of Liability</h2>
        <p>This service is provided as-is. We are not liable for any issues arising from the use of third-party APIs or platform policy changes.</p>
      </section>

      <section>
        <h2 className="text-lg font-semibold text-white mb-2">5. Contact</h2>
        <p>For questions, contact: romkesmeindert@gmail.com</p>
      </section>
    </div>
  )
}
