import Link from 'next/link';

export default function LandingPage() {
  return (
    <main className="flex min-h-screen items-center justify-center">
      <a
        href={`${process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:3001'}/auth/google`}
        className="rounded bg-blue-600 px-6 py-3 text-white hover:bg-blue-700"
      >
        Sign in with Google
      </a>
    </main>
  );
}
