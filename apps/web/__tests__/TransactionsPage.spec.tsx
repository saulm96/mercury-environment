import { render, screen, fireEvent, waitFor, act } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import TransactionsPage from '../src/pages/tools/transactions/TransactionsPage';
import type { Transaction, Category, RecurringTransaction } from '@mercury/shared';

// ---------------------------------------------------------------------------
// Mock data
// ---------------------------------------------------------------------------

const mockTransaction: Transaction = {
  id: 'tx-1',
  userId: 'user-1',
  type: 'expense' as const,
  amount: 42.99,
  description: 'Groceries',
  date: '2025-06-15',
  categoryId: 'cat-1',
  createdAt: new Date('2025-06-15'),
  updatedAt: new Date('2025-06-15'),
};

const mockRecurringTransaction: Transaction = {
  id: 'tx-2',
  userId: 'user-1',
  type: 'expense' as const,
  amount: 9.99,
  description: 'Streaming',
  date: '2025-06-01',
  categoryId: null,
  recurringTransactionId: 'rt-1',
  createdAt: new Date('2025-06-01'),
  updatedAt: new Date('2025-06-01'),
};

const mockCategories: Category[] = [
  {
    id: 'cat-1',
    userId: 'user-1',
    name: 'Food',
    color: '#FF6B6B',
    type: 'expense' as const,
    isFallback: false,
    createdAt: new Date('2025-01-01'),
    updatedAt: new Date('2025-01-01'),
  },
  {
    id: 'cat-2',
    userId: 'user-1',
    name: 'Salary',
    color: '#2ECC71',
    type: 'income' as const,
    isFallback: false,
    createdAt: new Date('2025-01-02'),
    updatedAt: new Date('2025-01-02'),
  },
];

const mockRecurringTemplate: RecurringTransaction = {
  id: 'rt-1',
  userId: 'user-1',
  type: 'expense' as const,
  amount: 9.99,
  description: 'Streaming',
  frequency: 'monthly' as const,
  interval: 1,
  startDate: '2025-06-01',
  endDate: null,
  nextDate: '2025-07-01',
  dayOfMonth: 1,
  dayOfWeek: null,
  categoryId: null,
  status: 'active' as const,
  createdAt: new Date('2025-06-01'),
  updatedAt: new Date('2025-06-01'),
};

// ---------------------------------------------------------------------------
// Shared mock state (mutated per test)
// ---------------------------------------------------------------------------

const mockHandleCreate = jest.fn().mockResolvedValue(undefined);
const mockHandleUpdate = jest.fn().mockResolvedValue(undefined);
const mockHandleCreateCategory = jest.fn().mockResolvedValue({});
const mockHandleDeleteCategory = jest.fn().mockResolvedValue(undefined);
const mockOpenCreateModal = jest.fn();
const mockOpenEditModal = jest.fn();
const mockCloseModal = jest.fn();
const mockFetchTransactions = jest.fn();

const mockUseTransactions = {
  transactions: [] as Transaction[],
  loading: false,
  error: null as string | null,
  modal: { open: false } as { open: boolean; transaction?: Transaction },
  categories: [] as Category[],
  categoriesLoading: false,
  fetchTransactions: mockFetchTransactions,
  handleCreate: mockHandleCreate,
  handleUpdate: mockHandleUpdate,
  handleCreateCategory: mockHandleCreateCategory,
  handleDeleteCategory: mockHandleDeleteCategory,
  openCreateModal: mockOpenCreateModal,
  openEditModal: mockOpenEditModal,
  closeModal: mockCloseModal,
};

const mockRecurringHandleCreate = jest.fn().mockResolvedValue(mockRecurringTemplate);
const mockProcessDue = jest.fn().mockResolvedValue({ generated: 1, errors: [] });
const mockRecurringHandleUpdate = jest.fn().mockResolvedValue(undefined);
const mockRecurringHandleDelete = jest.fn().mockResolvedValue(undefined);
const mockRecurringHandleSkip = jest.fn().mockResolvedValue(undefined);
const mockRecurringHandleUnskip = jest.fn().mockResolvedValue(undefined);
const mockRecurringResetCache = jest.fn();

const mockUseRecurringTransactions = {
  recurringTransactions: [] as RecurringTransaction[],
  loading: false,
  error: null as string | null,
  fetchRecurringTransactions: jest.fn(),
  processDue: mockProcessDue,
  handleCreate: mockRecurringHandleCreate,
  handleUpdate: mockRecurringHandleUpdate,
  handleDelete: mockRecurringHandleDelete,
  handleSkip: mockRecurringHandleSkip,
  handleUnskip: mockRecurringHandleUnskip,
  resetCache: mockRecurringResetCache,
};

const mockSubscriptionHandleCreate = jest.fn().mockResolvedValue(undefined);
const mockSubscriptionHandleUpdate = jest.fn().mockResolvedValue(undefined);
const mockSubscriptionHandleDelete = jest.fn().mockResolvedValue(undefined);

const mockUseSubscriptions = {
  subscriptions: [],
  loading: false,
  error: null as string | null,
  fetchSubscriptions: jest.fn(),
  fetchStats: jest.fn(),
  fetchServiceTypes: jest.fn(),
  fetchUpcoming: jest.fn(),
  handleCreate: mockSubscriptionHandleCreate,
  handleUpdate: mockSubscriptionHandleUpdate,
  handleDelete: mockSubscriptionHandleDelete,
  stats: null,
  serviceTypeStats: [],
  upcomingRenewals: [],
  resetCache: jest.fn(),
};

jest.mock('../src/hooks/useTransactions', () => ({
  useTransactions: () => mockUseTransactions,
}));

jest.mock('../src/hooks/useRecurringTransactions', () => ({
  useRecurringTransactions: () => mockUseRecurringTransactions,
}));

jest.mock('../src/hooks/useSubscriptions', () => ({
  useSubscriptions: () => mockUseSubscriptions,
}));

jest.mock('../src/components/transactions/RecurringSyncProvider', () => ({
  useRecurringSync: () => ({ ready: true, error: null }),
}));

// ---------------------------------------------------------------------------
// Helper to reset the shared mock object to defaults
// ---------------------------------------------------------------------------

function resetMock() {
  mockUseTransactions.transactions = [];
  mockUseTransactions.loading = false;
  mockUseTransactions.error = null;
  mockUseTransactions.modal = { open: false };
  mockUseTransactions.categories = [];
  mockUseTransactions.categoriesLoading = false;

  mockUseRecurringTransactions.recurringTransactions = [];

  jest.clearAllMocks();
}

function renderPage() {
  return render(
    <MemoryRouter>
      <TransactionsPage />
    </MemoryRouter>,
  );
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe('TransactionsPage', () => {
  beforeEach(resetMock);

  // -------------------------------------------------------------------------
  // 1. Renders the "Transactions" heading and "New Transaction" button
  // -------------------------------------------------------------------------
  it('renders the "Transactions" heading and "New Transaction" button', () => {
    renderPage();

    expect(
      screen.getByRole('heading', { name: 'Transactions' }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole('button', { name: 'New Transaction' }),
    ).toBeInTheDocument();
  });

  // -------------------------------------------------------------------------
  // 2. Renders "Manage Categories" button (BulletListIcon)
  // -------------------------------------------------------------------------
  it('renders "Manage Categories" button with BulletListIcon', () => {
    renderPage();

    const categoryButton = screen.getByRole('button', {
      name: 'Manage Categories',
    });
    expect(categoryButton).toBeInTheDocument();
    const svg = categoryButton.querySelector('svg');
    expect(svg).toBeInTheDocument();
  });

  // -------------------------------------------------------------------------
  // 3. Passes loading state to TransactionCardList
  // -------------------------------------------------------------------------
  it('passes loading state to TransactionCardList', () => {
    mockUseTransactions.loading = true;

    renderPage();

    expect(
      screen.queryByText('No transactions yet'),
    ).not.toBeInTheDocument();
    expect(
      screen.queryByText(/Please try refreshing/),
    ).not.toBeInTheDocument();
  });

  // -------------------------------------------------------------------------
  // 4. Passes error state to TransactionCardList
  // -------------------------------------------------------------------------
  it('passes error state to TransactionCardList', () => {
    mockUseTransactions.error = 'Network failure';

    renderPage();

    expect(screen.getByText('Network failure')).toBeInTheDocument();
    expect(
      screen.getByText('Please try refreshing the page.'),
    ).toBeInTheDocument();
  });

  // -------------------------------------------------------------------------
  // 5. Passes transactions data to TransactionCardList
  // -------------------------------------------------------------------------
  it('passes transactions data to TransactionCardList', () => {
    mockUseTransactions.transactions = [mockTransaction, mockRecurringTransaction];

    renderPage();

    expect(screen.getByText('Groceries')).toBeInTheDocument();
    expect(screen.getByText('Streaming')).toBeInTheDocument();
  });

  // -------------------------------------------------------------------------
  // 6. Clicking "New Transaction" calls openCreateModal from the hook
  // -------------------------------------------------------------------------
  it('clicking "New Transaction" calls openCreateModal from the hook', () => {
    renderPage();

    fireEvent.click(screen.getByRole('button', { name: 'New Transaction' }));

    expect(mockOpenCreateModal).toHaveBeenCalledTimes(1);
  });

  // -------------------------------------------------------------------------
  // 7. Clicking a transaction card calls openEditModal with the transaction
  // -------------------------------------------------------------------------
  it('clicking a transaction card calls openEditModal with the transaction', () => {
    mockUseTransactions.transactions = [mockTransaction];

    renderPage();

    const cardDescription = screen.getByText('Groceries');
    const card = cardDescription.parentElement!;
    fireEvent.click(card);

    expect(mockOpenEditModal).toHaveBeenCalledTimes(1);
    expect(mockOpenEditModal).toHaveBeenCalledWith(mockTransaction);
  });

  // -------------------------------------------------------------------------
  // 8. Clicking "Manage Categories" opens the CategoryManager modal
  // -------------------------------------------------------------------------
  it('clicking "Manage Categories" opens the CategoryManager modal', () => {
    renderPage();

    expect(
      screen.queryByRole('dialog', { name: 'Manage Categories' }),
    ).not.toBeInTheDocument();

    fireEvent.click(
      screen.getByRole('button', { name: 'Manage Categories' }),
    );

    const dialog = screen.getByRole('dialog', { name: 'Manage Categories' });
    expect(dialog).toBeInTheDocument();
    expect(dialog).toHaveAttribute('aria-modal', 'true');
  });

  // -------------------------------------------------------------------------
  // 9. Clicking overlay on CategoryManager modal closes it
  // -------------------------------------------------------------------------
  it('clicking the modal overlay closes the CategoryManager modal', () => {
    renderPage();

    fireEvent.click(
      screen.getByRole('button', { name: 'Manage Categories' }),
    );

    const dialog = screen.getByRole('dialog', { name: 'Manage Categories' });
    expect(dialog).toBeInTheDocument();

    fireEvent.click(dialog);

    expect(
      screen.queryByRole('dialog', { name: 'Manage Categories' }),
    ).not.toBeInTheDocument();
  });

  // -------------------------------------------------------------------------
  // 9b. Clicking close button on CategoryManager modal closes it
  // -------------------------------------------------------------------------
  it('clicking the close button closes the CategoryManager modal', () => {
    renderPage();

    fireEvent.click(
      screen.getByRole('button', { name: 'Manage Categories' }),
    );

    expect(
      screen.getByRole('dialog', { name: 'Manage Categories' }),
    ).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: 'Close' }));

    expect(
      screen.queryByRole('dialog', { name: 'Manage Categories' }),
    ).not.toBeInTheDocument();
  });

  // -------------------------------------------------------------------------
  // 10. CategoryManager modal receives categories and callbacks from the hook
  // -------------------------------------------------------------------------
  it('CategoryManager modal receives categories and callbacks from the hook', () => {
    mockUseTransactions.categories = mockCategories;

    renderPage();

    fireEvent.click(
      screen.getByRole('button', { name: 'Manage Categories' }),
    );

    expect(screen.getByText('Food')).toBeInTheDocument();
    expect(screen.getByText('Salary')).toBeInTheDocument();

    expect(
      screen.getByRole('heading', { name: 'Manage Categories' }),
    ).toBeInTheDocument();
  });

  // -------------------------------------------------------------------------
  // 11. Displays TransactionModal when modal.open is true
  // -------------------------------------------------------------------------
  it('displays TransactionModal when modal.open is true', () => {
    mockUseTransactions.modal = { open: true };
    mockUseTransactions.categories = mockCategories;

    renderPage();

    const dialog = screen.getByRole('dialog');
    expect(dialog).toBeInTheDocument();
    expect(
      screen.getByRole('heading', { name: 'New Transaction' }),
    ).toBeInTheDocument();
  });

  // -------------------------------------------------------------------------
  // 12. Submitting a new transaction via the modal calls handleCreate
  // -------------------------------------------------------------------------
  it('submitting a new transaction via the modal calls handleCreate', async () => {
    mockUseTransactions.modal = { open: true };
    mockUseTransactions.categories = mockCategories;

    renderPage();

    fireEvent.change(screen.getByLabelText('Amount'), {
      target: { value: '75.50' },
    });
    fireEvent.change(screen.getByLabelText('Description'), {
      target: { value: 'Dinner out' },
    });

    await act(async () => {
      fireEvent.click(screen.getByRole('button', { name: 'Create Transaction' }));
    });

    expect(mockHandleCreate).toHaveBeenCalledTimes(1);
    expect(mockHandleCreate).toHaveBeenCalledWith({
      type: 'expense',
      amount: 75.5,
      description: 'Dinner out',
      date: expect.any(String),
      categoryId: undefined,
    });
  });

  // -------------------------------------------------------------------------
  // 13. Creating a recurring transaction calls the recurring flow
  // -------------------------------------------------------------------------
  it('creating a recurring transaction calls handleCreateRecurring, processDue, and fetchTransactions', async () => {
    mockUseTransactions.modal = { open: true };
    mockUseTransactions.categories = mockCategories;

    renderPage();

    fireEvent.change(screen.getByLabelText('Amount'), {
      target: { value: '100' },
    });
    fireEvent.change(screen.getByLabelText('Description'), {
      target: { value: 'Rent' },
    });
    fireEvent.change(screen.getByLabelText('Date'), {
      target: { value: '2025-01-01' },
    });
    fireEvent.click(screen.getByLabelText('Recurring?'));

    await act(async () => {
      fireEvent.click(screen.getByRole('button', { name: 'Create Recurring' }));
    });

    expect(mockRecurringHandleCreate).toHaveBeenCalledTimes(1);
    expect(mockRecurringHandleCreate).toHaveBeenCalledWith({
      type: 'expense',
      amount: 100,
      description: 'Rent',
      date: '2025-01-01',
      frequency: 'monthly',
      interval: 1,
      categoryId: undefined,
    });
    expect(mockProcessDue).toHaveBeenCalledTimes(1);
    expect(mockFetchTransactions).toHaveBeenCalledTimes(1);
    expect(mockCloseModal).toHaveBeenCalledTimes(1);
    expect(mockSubscriptionHandleCreate).not.toHaveBeenCalled();
  });

  // -------------------------------------------------------------------------
  // 14. Creating a recurring + subscription transaction also creates a subscription
  // -------------------------------------------------------------------------
  it('creating a recurring subscription also calls handleCreateSubscription', async () => {
    mockUseTransactions.modal = { open: true };
    mockUseTransactions.categories = mockCategories;

    renderPage();

    fireEvent.change(screen.getByLabelText('Amount'), {
      target: { value: '15' },
    });
    fireEvent.change(screen.getByLabelText('Description'), {
      target: { value: 'Netflix' },
    });
    fireEvent.change(screen.getByLabelText('Date'), {
      target: { value: '2025-01-01' },
    });
    fireEvent.click(screen.getByLabelText('Recurring?'));
    fireEvent.click(screen.getByLabelText('Mark as subscription'));

    await act(async () => {
      fireEvent.click(screen.getByRole('button', { name: 'Create Recurring' }));
    });

    expect(mockRecurringHandleCreate).toHaveBeenCalledTimes(1);
    expect(mockProcessDue).toHaveBeenCalledTimes(1);
    expect(mockFetchTransactions).toHaveBeenCalledTimes(1);
    expect(mockSubscriptionHandleCreate).toHaveBeenCalledTimes(1);
    expect(mockSubscriptionHandleCreate).toHaveBeenCalledWith({
      recurringTransactionId: mockRecurringTemplate.id,
      serviceType: 'streaming',
    });
    expect(mockCloseModal).toHaveBeenCalledTimes(1);
  });

  // -------------------------------------------------------------------------
  // 15. Clicking the recurring badge opens the series-edit modal
  // -------------------------------------------------------------------------
  it('clicking the recurring badge opens the series-edit modal', () => {
    mockUseTransactions.transactions = [mockRecurringTransaction];
    mockUseRecurringTransactions.recurringTransactions = [mockRecurringTemplate];

    renderPage();

    expect(
      screen.queryByRole('dialog', { name: 'Edit Recurring Series' }),
    ).not.toBeInTheDocument();

    const badge = screen.getByRole('button', { name: 'View recurring series' });
    fireEvent.click(badge);

    const dialog = screen.getByRole('dialog', { name: 'Edit Recurring Series' });
    expect(dialog).toBeInTheDocument();
    expect(
      screen.getByRole('heading', { name: 'Edit Recurring Series' }),
    ).toBeInTheDocument();
  });

  // -------------------------------------------------------------------------
  // 16. The series-edit modal shows the RecurringTransactionForm pre-filled
  // -------------------------------------------------------------------------
  it('pre-fills the series-edit modal with the recurring template data', () => {
    mockUseTransactions.transactions = [mockRecurringTransaction];
    mockUseRecurringTransactions.recurringTransactions = [mockRecurringTemplate];

    renderPage();

    fireEvent.click(screen.getByRole('button', { name: 'View recurring series' }));

    const descriptionInput = screen.getByLabelText('Description') as HTMLInputElement;
    expect(descriptionInput.value).toBe('Streaming');

    const amountInput = screen.getByLabelText('Amount') as HTMLInputElement;
    expect(amountInput.value).toBe('9.99');
  });

  // -------------------------------------------------------------------------
  // 17. Saving the series-edit modal calls handleUpdateRecurring and refreshes
  // -------------------------------------------------------------------------
  it('saving the series-edit modal updates the recurring series and refreshes transactions', async () => {
    mockUseTransactions.transactions = [mockRecurringTransaction];
    mockUseRecurringTransactions.recurringTransactions = [mockRecurringTemplate];

    renderPage();

    fireEvent.click(screen.getByRole('button', { name: 'View recurring series' }));

    fireEvent.change(screen.getByLabelText('Description'), {
      target: { value: 'Updated Streaming' },
    });

    await act(async () => {
      fireEvent.click(screen.getByRole('button', { name: 'Save Changes' }));
    });

    expect(mockRecurringHandleUpdate).toHaveBeenCalledTimes(1);
    expect(mockRecurringHandleUpdate).toHaveBeenCalledWith(
      'rt-1',
      expect.objectContaining({
        description: 'Updated Streaming',
      }),
    );
    expect(mockFetchTransactions).toHaveBeenCalledTimes(1);
    expect(
      screen.queryByRole('dialog', { name: 'Edit Recurring Series' }),
    ).not.toBeInTheDocument();
  });

  // -------------------------------------------------------------------------
  // 18. Deleting from the series-edit modal calls handleDeleteRecurring and refreshes
  // -------------------------------------------------------------------------
  it('deleting from the series-edit modal deletes the recurring series and refreshes transactions', async () => {
    mockUseTransactions.transactions = [mockRecurringTransaction];
    mockUseRecurringTransactions.recurringTransactions = [mockRecurringTemplate];

    renderPage();

    fireEvent.click(screen.getByRole('button', { name: 'View recurring series' }));

    await act(async () => {
      fireEvent.click(screen.getByRole('button', { name: 'Delete series' }));
    });

    expect(mockRecurringHandleDelete).toHaveBeenCalledTimes(1);
    expect(mockRecurringHandleDelete).toHaveBeenCalledWith('rt-1');
    expect(mockFetchTransactions).toHaveBeenCalledTimes(1);
    expect(
      screen.queryByRole('dialog', { name: 'Edit Recurring Series' }),
    ).not.toBeInTheDocument();
  });
});
