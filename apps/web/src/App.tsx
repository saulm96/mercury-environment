import { Routes, Route } from 'react-router-dom';
import LandingPage from './pages/LandingPage';
import ToolsLayout from './pages/tools/ToolsLayout';
import TransactionsPage from './pages/tools/transactions/TransactionsPage';

export default function App() {
  return (
    <Routes>
      <Route index element={<LandingPage />} />
      <Route element={<ToolsLayout />}>
        <Route path="transactions" element={<TransactionsPage />} />
      </Route>
    </Routes>
  );
}
