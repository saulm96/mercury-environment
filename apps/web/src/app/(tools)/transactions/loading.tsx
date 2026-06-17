export default function TransactionsLoading() {
  return (
    <main className="p-8">
      <div className="h-8 w-48 bg-gray-200 animate-pulse rounded mb-4" />
      {Array.from({ length: 5 }).map((_, i) => (
        <div key={i} className="h-16 bg-gray-100 animate-pulse rounded mb-2" />
      ))}
    </main>
  );
}
