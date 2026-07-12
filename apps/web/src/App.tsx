import { Suspense } from 'react';
import { Routes, Route } from 'react-router-dom';
import { ErrorBoundary } from 'react-error-boundary';
import LandingPage from './pages/LandingPage';
import ToolsLayout from './pages/tools/ToolsLayout';
import TransactionsPage from './pages/tools/transactions/TransactionsPage';
import TransactionsSkeleton from './pages/tools/transactions/TransactionsSkeleton';
import TransactionsError from './pages/tools/transactions/TransactionsError';

export default function App() {
  return (
    <Routes>
      <Route index element={<LandingPage />} />
      <Route element={<ToolsLayout />}>
        <Route
          path="transactions"
          element={
            <ErrorBoundary FallbackComponent={TransactionsError}>
              <Suspense fallback={<TransactionsSkeleton />}>
                <TransactionsPage />
              </Suspense>
            </ErrorBoundary>
          }
        />
      </Route>
    </Routes>
  );
}
