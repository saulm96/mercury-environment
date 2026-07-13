import { render, screen, fireEvent } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import DashboardPage from '../src/pages/tools/dashboard/DashboardPage';
import type { BudgetStat, Category, BudgetStats } from '@mercury/shared';

const mockCategories: Category[] = [
  {
    id: 'cat-1',
    userId: 'user-1',
    name: 'Alquiler',
    color: '#FF6B6B',
    type: 'expense',
    isFallback: false,
    createdAt: new Date('2025-01-01'),
    updatedAt: new Date('2025-01-01'),
  },
  {
    id: 'cat-2',
    userId: 'user-1',
    name: 'Comida',
    color: '#2ECC71',
    type: 'expense',
    isFallback: false,
    createdAt: new Date('2025-01-02'),
    updatedAt: new Date('2025-01-02'),
  },
];

const mockBudgetStats: BudgetStat[] = [
  {
    id: 'budget-1',
    name: 'Vivienda',
    value: 500.0,
    allocated: 600.0,
    spent: 520.0,
    remaining: 80.0,
    progress: 87,
    status: 'under',
    categories: [mockCategories[0]],
  },
  {
    id: 'budget-2',
    name: 'Entretenimiento',
    value: 10.0,
    allocated: 14.99,
    spent: 20.0,
    remaining: -5.01,
    progress: 133,
    status: 'over',
    categories: [mockCategories[1]],
  },
];

const mockStats: BudgetStats = {
  period: { year: 2026, month: 7 },
  totalIncome: 3000.0,
  totalExpenses: 1800.0,
  totalAllocated: 1200.0,
  estimatedSavings: 1800.0,
  actualSavings: 1200.0,
  budgets: mockBudgetStats,
};

const mockFetchStats = jest.fn().mockResolvedValue(undefined);
const mockFetchSubscriptionStats = jest.fn().mockResolvedValue(undefined);

const mockUseBudgets = {
  budgets: [] as BudgetStat[],
  stats: null as BudgetStats | null,
  loading: false,
  error: null as string | null,
  fetchBudgets: jest.fn().mockResolvedValue(undefined),
  fetchStats: mockFetchStats,
  handleCreate: jest.fn().mockResolvedValue({}),
  handleUpdate: jest.fn().mockResolvedValue(undefined),
  handleDelete: jest.fn().mockResolvedValue(undefined),
};

jest.mock('../src/hooks/useBudgets', () => ({
  useBudgets: () => mockUseBudgets,
}));

const mockUseSubscriptions = {
  subscriptions: [],
  loading: false,
  error: null,
  fetchSubscriptions: jest.fn().mockResolvedValue(undefined),
  fetchStats: mockFetchSubscriptionStats,
  fetchServiceTypes: jest.fn().mockResolvedValue(undefined),
  fetchUpcoming: jest.fn().mockResolvedValue(undefined),
  handleCreate: jest.fn().mockResolvedValue(undefined),
  handleUpdate: jest.fn().mockResolvedValue(undefined),
  handleDelete: jest.fn().mockResolvedValue(undefined),
  stats: null,
  serviceTypeStats: [],
  upcomingRenewals: [],
  resetCache: jest.fn(),
};

jest.mock('../src/hooks/useSubscriptions', () => ({
  useSubscriptions: () => mockUseSubscriptions,
}));

jest.mock('../src/components/transactions/RecurringSyncProvider', () => ({
  useRecurringSync: () => ({ ready: true, error: null }),
}));

function resetMock() {
  mockUseBudgets.budgets = [];
  mockUseBudgets.stats = null;
  mockUseBudgets.loading = false;
  mockUseBudgets.error = null;
  mockUseSubscriptions.stats = null;
  jest.clearAllMocks();
}

describe('DashboardPage', () => {
  beforeEach(resetMock);

  it('renders dashboard heading and month navigation', () => {
    mockUseBudgets.stats = mockStats;

    render(<DashboardPage />);

    expect(screen.getByRole('heading', { name: 'Dashboard' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Previous month' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Next month' })).toBeInTheDocument();
  });

  it('displays monthly summary cards with correct values', () => {
    mockUseBudgets.stats = mockStats;

    render(<DashboardPage />);

    expect(screen.getByText('3000.00€')).toBeInTheDocument();
    expect(screen.getByText('1200.00€')).toBeInTheDocument();
    const eighteenHundredElements = screen.getAllByText('1800.00€');
    expect(eighteenHundredElements).toHaveLength(2);

    expect(screen.getByText('Total Income')).toBeInTheDocument();
    expect(screen.getByText('Total Expenses')).toBeInTheDocument();
    expect(screen.getByText('Est. Savings')).toBeInTheDocument();
    expect(screen.getByText('Actual Savings')).toBeInTheDocument();
  });

  it('renders budget progress bars for each budget', () => {
    mockUseBudgets.stats = mockStats;

    render(<DashboardPage />);

    expect(screen.getByText('Vivienda')).toBeInTheDocument();
    expect(screen.getByText('Entretenimiento')).toBeInTheDocument();

    expect(screen.getByText('500.00€')).toBeInTheDocument();
    expect(screen.getByText('10.00€')).toBeInTheDocument();
    expect(screen.getByText('600.00€')).toBeInTheDocument();
    expect(screen.getByText('14.99€')).toBeInTheDocument();

    expect(screen.getByText('On track (87%)')).toBeInTheDocument();
    expect(screen.getByText('Over budget (133%)')).toBeInTheDocument();
  });

  it('shows loading state with skeleton cards', () => {
    mockUseBudgets.loading = true;

    render(<DashboardPage />);

    const skeletons = document.querySelectorAll('[class]');
    expect(skeletons.length).toBeGreaterThan(0);
    expect(screen.queryByText('Total Income')).not.toBeInTheDocument();
  });

  it('shows empty state when no budgets exist', () => {
    mockUseBudgets.stats = {
      ...mockStats,
      budgets: [],
      totalIncome: 0,
      totalExpenses: 0,
      estimatedSavings: 0,
      actualSavings: 0,
    };

    render(<DashboardPage />);

    expect(screen.getByText('No budgets found for this month.')).toBeInTheDocument();
  });

  it('month navigation buttons change the displayed month', () => {
    mockUseBudgets.stats = mockStats;

    render(<DashboardPage />);

    const nextButton = screen.getByRole('button', { name: 'Next month' });
    fireEvent.click(nextButton);

    expect(mockFetchStats).toHaveBeenCalled();
  });

  it('shows error state with retry button', () => {
    mockUseBudgets.error = 'Network failure';

    render(<DashboardPage />);

    expect(screen.getByText('Network failure')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Retry' })).toBeInTheDocument();
  });

  it('renders SubscriptionSummaryWidget when subscriptions exist', () => {
    mockUseBudgets.stats = mockStats;
    mockUseSubscriptions.stats = {
      monthlyTotal: 92.45,
      yearlyTotal: 1109.4,
      activeCount: 4,
      nextRenewal: { description: 'Netflix', date: '2025-08-15', daysUntil: 5 },
    };

    render(
      <MemoryRouter>
        <DashboardPage />
      </MemoryRouter>,
    );

    expect(screen.getByText('Subscriptions')).toBeInTheDocument();
    expect(screen.getByText('92.45€')).toBeInTheDocument();
    expect(screen.getByText('4 active')).toBeInTheDocument();
    expect(screen.getByText(/Netflix/)).toBeInTheDocument();
  });

  it('does not render SubscriptionSummaryWidget when there are no active subscriptions', () => {
    mockUseBudgets.stats = mockStats;
    mockUseSubscriptions.stats = {
      monthlyTotal: 0,
      yearlyTotal: 0,
      activeCount: 0,
      nextRenewal: null,
    };

    render(
      <MemoryRouter>
        <DashboardPage />
      </MemoryRouter>,
    );

    expect(screen.queryByText('Subscriptions')).not.toBeInTheDocument();
  });
});
