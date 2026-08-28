export default function OverviewPage() {
  return (
    <div>
      <h1 className="text-2xl font-bold tracking-wider uppercase text-stone-100 mb-2">
        Overview
      </h1>
      <p className="text-stone-500 text-sm tracking-wide mb-8">
        Jack Howlin&apos; Command Center
      </p>
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <StatCard label="New Comments" value="—" />
        <StatCard label="Scheduled Posts" value="—" />
        <StatCard label="Replies Approved" value="—" />
      </div>
    </div>
  )
}

function StatCard({ label, value }: { label: string; value: string }) {
  return (
    <div className="bg-stone-800 border border-stone-700 p-6">
      <p className="text-stone-400 text-xs tracking-widest uppercase mb-2">{label}</p>
      <p className="text-3xl font-bold text-amber-500">{value}</p>
    </div>
  )
}
