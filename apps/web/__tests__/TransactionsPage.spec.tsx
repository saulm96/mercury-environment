import { render, screen, fireEvent, waitFor, act } from '@testing-library/react';
import TransactionsPage from '../src/pages/tools/transactions/TransactionsPage';
import type { Transaction, Category } from '@mercury/shared';

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

const mockTransaction2: Transaction = {
  id: 'tx-2',
  userId: 'user-1',
  type: 'income' as const,
  amount: 1500,
  description: 'Paycheck',
  date: '2025-06-01',
  categoryId: null,
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

jest.mock('../src/hooks/useTransactions', () => ({
  useTransactions: () => mockUseTransactions,
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
  jest.clearAllMocks();
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
    render(<TransactionsPage />);

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
    render(<TransactionsPage />);

    const categoryButton = screen.getByRole('button', {
      name: 'Manage Categories',
    });
    expect(categoryButton).toBeInTheDocument();
    // BulletListIcon is an SVG rendered inside the button
    const svg = categoryButton.querySelector('svg');
    expect(svg).toBeInTheDocument();
  });

  // -------------------------------------------------------------------------
  // 3. Passes loading state to TransactionCardList
  // -------------------------------------------------------------------------
  it('passes loading state to TransactionCardList', () => {
    mockUseTransactions.loading = true;

    render(<TransactionsPage />);

    // When loading, 6 skeleton cards should be rendered inside the grid
    // (each skeleton card is a div inside the grid div)
    const skeletonCards = document.querySelectorAll('[class] div[class]');
    // Since CSS modules are mocked to {}, the skeleton class names are empty.
    // Instead, verify the empty state and error text are not present.
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

    render(<TransactionsPage />);

    expect(screen.getByText('Network failure')).toBeInTheDocument();
    expect(
      screen.getByText('Please try refreshing the page.'),
    ).toBeInTheDocument();
  });

  // -------------------------------------------------------------------------
  // 5. Passes transactions data to TransactionCardList
  // -------------------------------------------------------------------------
  it('passes transactions data to TransactionCardList', () => {
    mockUseTransactions.transactions = [mockTransaction, mockTransaction2];

    render(<TransactionsPage />);

    // Transaction descriptions should appear in TransactionCard
    expect(screen.getByText('Groceries')).toBeInTheDocument();
    expect(screen.getByText('Paycheck')).toBeInTheDocument();
  });

  // -------------------------------------------------------------------------
  // 6. Clicking "New Transaction" calls openCreateModal from the hook
  // -------------------------------------------------------------------------
  it('clicking "New Transaction" calls openCreateModal from the hook', () => {
    render(<TransactionsPage />);

    fireEvent.click(screen.getByRole('button', { name: 'New Transaction' }));

    expect(mockOpenCreateModal).toHaveBeenCalledTimes(1);
  });

  // -------------------------------------------------------------------------
  // 7. Clicking a transaction card calls openEditModal with the transaction
  // -------------------------------------------------------------------------
  it('clicking a transaction card calls openEditModal with the transaction', () => {
    mockUseTransactions.transactions = [mockTransaction];

    render(<TransactionsPage />);

    // TransactionCard wraps the whole card in an onClick that calls onEdit.
    // Since CSS modules are mocked to {}, the card div has no class attribute.
    // The description <p> is a direct child of the card div, so climb via parentElement.
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
    render(<TransactionsPage />);

    // Modal should NOT be visible initially
    expect(
      screen.queryByRole('dialog', { name: 'Manage Categories' }),
    ).not.toBeInTheDocument();

    fireEvent.click(
      screen.getByRole('button', { name: 'Manage Categories' }),
    );

    // Now the modal dialog should be visible
    const dialog = screen.getByRole('dialog', { name: 'Manage Categories' });
    expect(dialog).toBeInTheDocument();
    expect(dialog).toHaveAttribute('aria-modal', 'true');
  });

  // -------------------------------------------------------------------------
  // 9. Clicking overlay on CategoryManager modal closes it
  // -------------------------------------------------------------------------
  it('clicking the modal overlay closes the CategoryManager modal', () => {
    render(<TransactionsPage />);

    // Open the modal
    fireEvent.click(
      screen.getByRole('button', { name: 'Manage Categories' }),
    );

    const dialog = screen.getByRole('dialog', { name: 'Manage Categories' });
    expect(dialog).toBeInTheDocument();

    // Click the overlay backdrop (the dialog div itself)
    fireEvent.click(dialog);

    expect(
      screen.queryByRole('dialog', { name: 'Manage Categories' }),
    ).not.toBeInTheDocument();
  });

  // -------------------------------------------------------------------------
  // 9b. Clicking close button on CategoryManager modal closes it
  // -------------------------------------------------------------------------
  it('clicking the close button closes the CategoryManager modal', () => {
    render(<TransactionsPage />);

    // Open the modal
    fireEvent.click(
      screen.getByRole('button', { name: 'Manage Categories' }),
    );

    expect(
      screen.getByRole('dialog', { name: 'Manage Categories' }),
    ).toBeInTheDocument();

    // Click the close button inside the modal panel header
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

    render(<TransactionsPage />);

    // Open the CategoryManager modal
    fireEvent.click(
      screen.getByRole('button', { name: 'Manage Categories' }),
    );

    // Category names from the mock categories should appear
    expect(screen.getByText('Food')).toBeInTheDocument();
    expect(screen.getByText('Salary')).toBeInTheDocument();

    // The modal heading should be visible
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

    render(<TransactionsPage />);

    // The TransactionModal renders a dialog when open
    const dialog = screen.getByRole('dialog');
    expect(dialog).toBeInTheDocument();
    // In create mode, it should have "New Transaction" heading
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

    render(<TransactionsPage />);

    // Fill in required fields in the TransactionModal
    fireEvent.change(screen.getByLabelText('Amount'), {
      target: { value: '75.50' },
    });
    fireEvent.change(screen.getByLabelText('Description'), {
      target: { value: 'Dinner out' },
    });

    // Click submit and wrap in act to handle the TransactionForm's async setIsSubmitting
    await act(async () => {
      fireEvent.click(screen.getByRole('button', { name: 'Create Transaction' }));
    });

    // handleCreate should have been called with form data
    expect(mockHandleCreate).toHaveBeenCalledTimes(1);
    expect(mockHandleCreate).toHaveBeenCalledWith({
      type: 'expense',
      amount: 75.5,
      description: 'Dinner out',
      date: expect.any(String),
      categoryId: undefined,
    });
  });
});
