import { Suspense } from 'react';
import { Routes, Route } from 'react-router-dom';
import { ErrorBoundary } from 'react-error-boundary';
import LandingPage from './pages/LandingPage';
import ToolsLayout from './pages/tools/ToolsLayout';
import EconomyLayout, { EconomyIndex } from './pages/tools/economy/EconomyLayout';
import TransactionsPage from './pages/tools/transactions/TransactionsPage';
import TransactionsSkeleton from './pages/tools/transactions/TransactionsSkeleton';
import TransactionsError from './pages/tools/transactions/TransactionsError';
import RecurringPage from './pages/tools/recurring/RecurringPage';
import RecurringSkeleton from './pages/tools/recurring/RecurringSkeleton';
import RecurringError from './pages/tools/recurring/RecurringError';
import DashboardPage from './pages/tools/dashboard/DashboardPage';
import DashboardSkeleton from './pages/tools/dashboard/DashboardSkeleton';
import DashboardError from './pages/tools/dashboard/DashboardError';
import BudgetSettingsPage from './pages/tools/budgets/BudgetSettingsPage';
import BudgetSettingsSkeleton from './pages/tools/budgets/BudgetSettingsSkeleton';
import BudgetSettingsError from './pages/tools/budgets/BudgetSettingsError';

export default function App() {
  return (
    <Routes>
      <Route index element={<LandingPage />} />
      <Route element={<ToolsLayout />}>
        <Route path="economy" element={<EconomyLayout />}>
          <Route index element={<EconomyIndex />} />
          <Route
            path="dashboard"
            element={
              <ErrorBoundary FallbackComponent={DashboardError}>
                <Suspense fallback={<DashboardSkeleton />}>
                  <DashboardPage />
                </Suspense>
              </ErrorBoundary>
            }
          />
          <Route
            path="budgets"
            element={
              <ErrorBoundary FallbackComponent={BudgetSettingsError}>
                <Suspense fallback={<BudgetSettingsSkeleton />}>
                  <BudgetSettingsPage />
                </Suspense>
              </ErrorBoundary>
            }
          />
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
          <Route
            path="recurring"
            element={
              <ErrorBoundary FallbackComponent={RecurringError}>
                <Suspense fallback={<RecurringSkeleton />}>
                  <RecurringPage />
                </Suspense>
              </ErrorBoundary>
            }
          />
        </Route>
      </Route>
    </Routes>
  );
}
