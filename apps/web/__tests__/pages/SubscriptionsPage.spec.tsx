import { render, screen, fireEvent, waitFor, act } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import SubscriptionsPage from '../../src/pages/tools/subscriptions/SubscriptionsPage';
import type { Subscription, RecurringTransaction } from '@mercury/shared';

jest.mock('../../src/components/transactions/RecurringSyncProvider', () => ({
  useRecurringSync: () => ({ ready: true, error: null }),
}));

const mockRecurring: RecurringTransaction = {
  id: 'rt-1',
  userId: 'user-1',
  categoryId: 'cat-1',
  type: 'expense' as const,
  amount: 12.99,
  description: 'Netflix',
  frequency: 'monthly' as const,
  interval: 1,
  startDate: '2025-01-01',
  endDate: null,
  nextDate: '2025-08-15',
  dayOfMonth: 15,
  dayOfWeek: null,
  status: 'active' as const,
  category: {
    id: 'cat-1',
    userId: 'user-1',
    name: 'Entertainment',
    color: '#FF6B6B',
    type: 'expense' as const,
    isFallback: false,
    createdAt: new Date(),
    updatedAt: new Date(),
  },
  createdAt: new Date(),
  updatedAt: new Date(),
};

const mockSubscription: Subscription = {
  id: 'sub-1',
  userId: 'user-1',
  recurringTransactionId: 'rt-1',
  serviceType: 'streaming',
  recurringTransaction: mockRecurring,
  createdAt: new Date(),
  updatedAt: new Date(),
};

const mockFetchStats = jest.fn().mockResolvedValue(undefined);
const mockFetchServiceTypes = jest.fn().mockResolvedValue(undefined);
const mockFetchUpcoming = jest.fn().mockResolvedValue(undefined);
const mockHandleCreate = jest.fn().mockResolvedValue(undefined);
const mockHandleUpdate = jest.fn().mockResolvedValue(undefined);
const mockHandleDelete = jest.fn().mockResolvedValue(undefined);

const mockUseSubscriptions = {
  subscriptions: [] as Subscription[],
  loading: false,
  error: null as string | null,
  fetchSubscriptions: jest.fn().mockResolvedValue(undefined),
  fetchStats: mockFetchStats,
  fetchServiceTypes: mockFetchServiceTypes,
  fetchUpcoming: mockFetchUpcoming,
  handleCreate: mockHandleCreate,
  handleUpdate: mockHandleUpdate,
  handleDelete: mockHandleDelete,
  stats: null,
  serviceTypeStats: [] as { serviceType: string; monthlyTotal: number; count: number }[],
  upcomingRenewals: [] as Subscription[],
  resetCache: jest.fn(),
};

jest.mock('../../src/hooks/useSubscriptions', () => ({
  useSubscriptions: () => mockUseSubscriptions,
}));

const mockUseRecurringTransactions = {
  recurringTransactions: [] as RecurringTransaction[],
  loading: false,
  error: null,
  fetchRecurringTransactions: jest.fn().mockResolvedValue(undefined),
  processDue: jest.fn(),
  handleCreate: jest.fn(),
  handleUpdate: jest.fn(),
  handleDelete: jest.fn(),
  handleSkip: jest.fn(),
  handleUnskip: jest.fn(),
  resetCache: jest.fn(),
};

jest.mock('../../src/hooks/useRecurringTransactions', () => ({
  useRecurringTransactions: () => mockUseRecurringTransactions,
}));

function resetMock() {
  mockUseSubscriptions.subscriptions = [];
  mockUseSubscriptions.loading = false;
  mockUseSubscriptions.error = null;
  mockUseSubscriptions.stats = null;
  mockUseSubscriptions.serviceTypeStats = [];
  mockUseSubscriptions.upcomingRenewals = [];
  mockUseRecurringTransactions.recurringTransactions = [];
  jest.clearAllMocks();
}

function renderPage() {
  return render(
    <MemoryRouter>
      <SubscriptionsPage />
    </MemoryRouter>,
  );
}

describe('SubscriptionsPage', () => {
  beforeEach(resetMock);

  it('renders heading, month navigation and mark button', () => {
    renderPage();

    expect(screen.getByRole('heading', { name: 'Subscriptions' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Previous month' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Next month' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Mark as subscription' })).toBeInTheDocument();
  });

  it('fetches stats, service types and upcoming renewals on mount', async () => {
    renderPage();

    await waitFor(() => {
      expect(mockFetchStats).toHaveBeenCalled();
    });
    expect(mockFetchServiceTypes).toHaveBeenCalled();
    expect(mockFetchUpcoming).toHaveBeenCalled();
  });

  it('displays summary cards with correct values', () => {
    mockUseSubscriptions.stats = {
      monthlyTotal: 45.97,
      yearlyTotal: 551.64,
      activeCount: 3,
      nextRenewal: { description: 'Netflix', date: '2025-08-15', daysUntil: 5 },
    };

    renderPage();

    expect(screen.getByText('Monthly cost')).toBeInTheDocument();
    expect(screen.getByText('Yearly cost')).toBeInTheDocument();
    expect(screen.getByText('Active')).toBeInTheDocument();
    expect(screen.getByText('Next renewal')).toBeInTheDocument();
    expect(screen.getByText('3')).toBeInTheDocument();
    expect(screen.getByText('Netflix')).toBeInTheDocument();
    expect(screen.getByText(/in 5 days/)).toBeInTheDocument();
  });

  it('renders service type breakdown', () => {
    mockUseSubscriptions.serviceTypeStats = [
      { serviceType: 'streaming', monthlyTotal: 12.99, count: 1 },
      { serviceType: 'music', monthlyTotal: 9.99, count: 1 },
    ];

    renderPage();

    expect(screen.getByText('streaming')).toBeInTheDocument();
    expect(screen.getByText('music')).toBeInTheDocument();
  });

  it('renders upcoming renewals list', () => {
    mockUseSubscriptions.upcomingRenewals = [mockSubscription];

    renderPage();

    expect(screen.getByText('Netflix')).toBeInTheDocument();
  });

  it('renders subscription list items with service type badge', () => {
    mockUseSubscriptions.subscriptions = [mockSubscription];

    renderPage();

    expect(screen.getByText('Netflix')).toBeInTheDocument();
    expect(screen.getByText('streaming')).toBeInTheDocument();
  });

  it('opens mark subscription modal when button is clicked', () => {
    renderPage();

    fireEvent.click(screen.getByRole('button', { name: 'Mark as subscription' }));

    expect(screen.getByRole('dialog', { name: 'Mark as subscription' })).toBeInTheDocument();
    expect(screen.getByLabelText('Service type')).toBeInTheDocument();
  });

  it('creates a subscription from the modal', async () => {
    mockUseRecurringTransactions.recurringTransactions = [mockRecurring];

    renderPage();

    fireEvent.click(screen.getByRole('button', { name: 'Mark as subscription' }));

    fireEvent.change(screen.getByLabelText('Recurring transaction'), {
      target: { value: 'rt-1' },
    });
    fireEvent.change(screen.getByLabelText('Service type'), {
      target: { value: 'streaming' },
    });

    await act(async () => {
      fireEvent.click(screen.getByRole('button', { name: 'Save' }));
    });

    expect(mockHandleCreate).toHaveBeenCalledWith({
      recurringTransactionId: 'rt-1',
      serviceType: 'streaming',
    });
  });

  it('deletes a subscription when delete is confirmed', async () => {
    mockUseSubscriptions.subscriptions = [mockSubscription];

    renderPage();

    fireEvent.click(screen.getByRole('button', { name: /Delete Netflix/ }));

    expect(screen.getByRole('dialog', { name: 'Delete subscription' })).toBeInTheDocument();

    await act(async () => {
      fireEvent.click(screen.getByRole('button', { name: 'Delete' }));
    });

    expect(mockHandleDelete).toHaveBeenCalledWith('sub-1');
  });

  it('shows error state with retry button', () => {
    mockUseSubscriptions.error = 'Network failure';

    renderPage();

    expect(screen.getByText('Network failure')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Retry' })).toBeInTheDocument();
  });
});
