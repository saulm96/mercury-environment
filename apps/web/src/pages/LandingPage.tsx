import styles from './LandingPage.module.css';

export default function LandingPage() {
  const apiUrl = process.env.VITE_API_URL ?? 'http://localhost:3001';

  return (
    <main className={styles.main}>
      <a
        href={`${apiUrl}/auth/google`}
        className={styles.button}
      >
        Sign in with Google
      </a>
    </main>
  );
}
