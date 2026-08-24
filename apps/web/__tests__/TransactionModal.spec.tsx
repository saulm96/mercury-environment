import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { TransactionModal } from '../src/components/transactions/TransactionModal';
import type { Transaction, Category } from '@mercury/shared';

const mockTransaction: Transaction = {
  id: 'txn-1',
  userId: 'user-1',
  type: 'expense',
  amount: 42.5,
  description: 'Groceries',
  date: '2025-06-15',
  categoryId: 'cat-1',
  createdAt: new Date('2025-06-15'),
  updatedAt: new Date('2025-06-15'),
};

const mockTransactionIncome: Transaction = {
  id: 'txn-2',
  userId: 'user-1',
  type: 'income',
  amount: 1500,
  description: 'Paycheck',
  date: '2025-06-01',
  categoryId: null,
  createdAt: new Date('2025-06-01'),
  updatedAt: new Date('2025-06-01'),
};

const mockRecurringTransaction: Transaction = {
  ...mockTransaction,
  id: 'txn-3',
  recurringTransactionId: 'rt-1',
};

const mockCategories: Category[] = [
  {
    id: 'cat-1',
    userId: 'user-1',
    name: 'Food',
    color: '#FF6B6B',
    type: 'expense',
    isFallback: false,
    createdAt: new Date(),
    updatedAt: new Date(),
  },
  {
    id: 'cat-2',
    userId: 'user-1',
    name: 'Transport',
    color: '#4ECDC4',
    type: 'expense',
    isFallback: false,
    createdAt: new Date(),
    updatedAt: new Date(),
  },
  {
    id: 'cat-3',
    userId: 'user-1',
    name: 'Salary',
    color: '#2ECC71',
    type: 'income',
    isFallback: false,
    createdAt: new Date(),
    updatedAt: new Date(),
  },
];

const defaultProps = {
  categories: mockCategories,
  onCreateCategory: jest.fn(),
  onClose: jest.fn(),
  onSubmit: jest.fn(),
};

describe('TransactionModal', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  // ---------------------------------------------------------------------------
  // Rendering
  // ---------------------------------------------------------------------------

  it('does not render when isOpen is false', () => {
    render(
      <TransactionModal
        {...defaultProps}
        isOpen={false}
      />,
    );

    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
  });

  it('renders modal when isOpen is true', () => {
    render(
      <TransactionModal
        {...defaultProps}
        isOpen={true}
      />,
    );

    const dialog = screen.getByRole('dialog');
    expect(dialog).toBeInTheDocument();
    expect(dialog).toHaveAttribute('aria-modal', 'true');
  });

  it('renders in create mode with "New Transaction" heading and "Create Transaction" button', () => {
    render(
      <TransactionModal
        {...defaultProps}
        isOpen={true}
      />,
    );

    expect(screen.getByRole('heading', { name: 'New Transaction' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Create Transaction' })).toBeInTheDocument();
    expect(screen.getByRole('dialog')).toHaveAttribute('aria-label', 'New Transaction');
  });

  it('renders in edit mode with "Edit Transaction" heading and "Save Changes" button', () => {
    render(
      <TransactionModal
        {...defaultProps}
        isOpen={true}
        transaction={mockTransaction}
      />,
    );

    expect(screen.getByRole('heading', { name: 'Edit Transaction' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Save Changes' })).toBeInTheDocument();
    expect(screen.getByRole('dialog')).toHaveAttribute('aria-label', 'Edit Transaction');
  });

  it('shows recurring series hint when editing an occurrence', () => {
    render(
      <TransactionModal
        {...defaultProps}
        isOpen={true}
        transaction={mockRecurringTransaction}
        onEditSeries={jest.fn()}
      />,
    );

    expect(
      screen.getByText('This transaction belongs to a recurring series. Changes here only affect this occurrence.'),
    ).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Edit series instead' })).toBeInTheDocument();
  });

  it('does not show recurring series hint for a non-recurring transaction', () => {
    render(
      <TransactionModal
        {...defaultProps}
        isOpen={true}
        transaction={mockTransaction}
      />,
    );

    expect(
      screen.queryByText('This transaction belongs to a recurring series.'),
    ).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Edit series instead' })).not.toBeInTheDocument();
  });

  it('calls onEditSeries when "Edit series instead" is clicked', () => {
    const onEditSeries = jest.fn();

    render(
      <TransactionModal
        {...defaultProps}
        isOpen={true}
        transaction={mockRecurringTransaction}
        onEditSeries={onEditSeries}
      />,
    );

    fireEvent.click(screen.getByRole('button', { name: 'Edit series instead' }));

    expect(onEditSeries).toHaveBeenCalledTimes(1);
    expect(onEditSeries).toHaveBeenCalledWith(mockRecurringTransaction);
  });

  // ---------------------------------------------------------------------------
  // Pre-fill form fields (edit mode)
  // ---------------------------------------------------------------------------

  it('pre-fills amount, description, and date fields when editing', () => {
    render(
      <TransactionModal
        {...defaultProps}
        isOpen={true}
        transaction={mockTransaction}
      />,
    );

    const amountInput = screen.getByLabelText('Amount') as HTMLInputElement;
    const descriptionInput = screen.getByLabelText('Description') as HTMLInputElement;
    const dateInput = screen.getByLabelText('Date') as HTMLInputElement;

    expect(amountInput.value).toBe('42.5');
    expect(descriptionInput.value).toBe('Groceries');
    expect(dateInput.value).toBe('2025-06-15');
  });

  it('pre-fills category field when transaction has a categoryId', () => {
    render(
      <TransactionModal
        {...defaultProps}
        isOpen={true}
        transaction={mockTransaction}
      />,
    );

    // CategorySelect shows the selected category name ("Food" for cat-1)
    // When a category is selected, the placeholder becomes empty, so use
    // getByDisplayValue to find the input showing the category name.
    const categoryInput = screen.getByDisplayValue('Food') as HTMLInputElement;
    expect(categoryInput).toBeInTheDocument();
  });

  it('leaves category field empty when transaction has no categoryId', () => {
    render(
      <TransactionModal
        {...defaultProps}
        isOpen={true}
        transaction={mockTransactionIncome}
      />,
    );

    // When no category is selected, the placeholder remains visible.
    const categoryInput = screen.getByPlaceholderText('Search or create category...') as HTMLInputElement;
    expect(categoryInput.value).toBe('');
  });

  // ---------------------------------------------------------------------------
  // onClose behavior
  // ---------------------------------------------------------------------------

  it('calls onClose when clicking the overlay background', () => {
    const onClose = jest.fn();

    render(
      <TransactionModal
        {...defaultProps}
        isOpen={true}
        onClose={onClose}
      />,
    );

    const dialog = screen.getByRole('dialog');
    fireEvent.click(dialog);

    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it('does not call onClose when clicking inside the panel', () => {
    const onClose = jest.fn();

    render(
      <TransactionModal
        {...defaultProps}
        isOpen={true}
        onClose={onClose}
      />,
    );

    const heading = screen.getByRole('heading', { name: 'New Transaction' });
    fireEvent.click(heading);

    expect(onClose).not.toHaveBeenCalled();
  });

  it('calls onClose when clicking the Cancel button', () => {
    const onClose = jest.fn();

    render(
      <TransactionModal
        {...defaultProps}
        isOpen={true}
        onClose={onClose}
      />,
    );

    fireEvent.click(screen.getByRole('button', { name: 'Cancel' }));

    expect(onClose).toHaveBeenCalledTimes(1);
  });

  // ---------------------------------------------------------------------------
  // Submit — create mode
  // ---------------------------------------------------------------------------

  it('calls onSubmit with form data when submitting in create mode', async () => {
    const onSubmit = jest.fn().mockResolvedValue(undefined);

    render(
      <TransactionModal
        {...defaultProps}
        isOpen={true}
        onSubmit={onSubmit}
      />,
    );

    fireEvent.change(screen.getByLabelText('Amount'), {
      target: { value: '99.99' },
    });
    fireEvent.change(screen.getByLabelText('Description'), {
      target: { value: 'Train ticket' },
    });

    // Date defaults to today — leave as is
    fireEvent.click(screen.getByRole('button', { name: 'Create Transaction' }));

    await waitFor(() => {
      expect(onSubmit).toHaveBeenCalledTimes(1);
    });

    expect(onSubmit).toHaveBeenCalledWith({
      type: 'expense',
      amount: 99.99,
      description: 'Train ticket',
      date: expect.any(String), // today's date
      categoryId: undefined,
    });
  });

  // ---------------------------------------------------------------------------
  // Submit — edit mode
  // ---------------------------------------------------------------------------

  it('calls onSubmit with updated form data when submitting in edit mode', async () => {
    const onSubmit = jest.fn().mockResolvedValue(undefined);

    render(
      <TransactionModal
        {...defaultProps}
        isOpen={true}
        transaction={mockTransaction}
        onSubmit={onSubmit}
      />,
    );

    // Modify the amount and description
    fireEvent.change(screen.getByLabelText('Amount'), {
      target: { value: '55.75' },
    });
    fireEvent.change(screen.getByLabelText('Description'), {
      target: { value: 'Organic groceries' },
    });

    fireEvent.click(screen.getByRole('button', { name: 'Save Changes' }));

    await waitFor(() => {
      expect(onSubmit).toHaveBeenCalledTimes(1);
    });

    expect(onSubmit).toHaveBeenCalledWith({
      type: 'expense',
      amount: 55.75,
      description: 'Organic groceries',
      date: '2025-06-15',
      categoryId: 'cat-1',
    });
  });

  // ---------------------------------------------------------------------------
  // Client-side validation
  // ---------------------------------------------------------------------------

  it('does not call onSubmit when required fields are empty', () => {
    const onSubmit = jest.fn();

    render(
      <TransactionModal
        {...defaultProps}
        isOpen={true}
        onSubmit={onSubmit}
      />,
    );

    // Clear the pre-filled date so all fields are effectively empty
    fireEvent.change(screen.getByLabelText('Date'), {
      target: { value: '' },
    });

    fireEvent.click(screen.getByRole('button', { name: 'Create Transaction' }));

    expect(onSubmit).not.toHaveBeenCalled();

    // Validation errors should appear
    expect(screen.getByText('Please enter a valid positive amount.')).toBeInTheDocument();
    expect(screen.getByText('Description is required.')).toBeInTheDocument();
    expect(screen.getByText('Date is required.')).toBeInTheDocument();
  });

  it('shows validation error for negative amount and does not submit', () => {
    const onSubmit = jest.fn();

    const { container } = render(
      <TransactionModal
        {...defaultProps}
        isOpen={true}
        onSubmit={onSubmit}
      />,
    );

    // Set a negative amount.  JSDOM's HTML5 constraint validation
    // (min="0.01") intercepts form submission via button-click, so we
    // fire the submit event directly on the form element.
    fireEvent.change(screen.getByLabelText('Amount'), {
      target: { value: '-5' },
    });
    fireEvent.change(screen.getByLabelText('Description'), {
      target: { value: 'Something' },
    });

    const form = container.querySelector('form')!;
    fireEvent.submit(form);

    expect(onSubmit).not.toHaveBeenCalled();
    expect(screen.getByText('Please enter a valid positive amount.')).toBeInTheDocument();
  });

  it('shows validation error for zero amount and does not submit', () => {
    const onSubmit = jest.fn();

    const { container } = render(
      <TransactionModal
        {...defaultProps}
        isOpen={true}
        onSubmit={onSubmit}
      />,
    );

    fireEvent.change(screen.getByLabelText('Amount'), {
      target: { value: '0' },
    });
    fireEvent.change(screen.getByLabelText('Description'), {
      target: { value: 'Something' },
    });

    const form = container.querySelector('form')!;
    fireEvent.submit(form);

    expect(onSubmit).not.toHaveBeenCalled();
    expect(screen.getByText('Please enter a valid positive amount.')).toBeInTheDocument();
  });

  it('shows validation error for empty description and does not submit', () => {
    const onSubmit = jest.fn();

    render(
      <TransactionModal
        {...defaultProps}
        isOpen={true}
        onSubmit={onSubmit}
      />,
    );

    fireEvent.change(screen.getByLabelText('Amount'), {
      target: { value: '10' },
    });
    // Description left empty

    fireEvent.click(screen.getByRole('button', { name: 'Create Transaction' }));

    expect(onSubmit).not.toHaveBeenCalled();
    expect(screen.getByText('Description is required.')).toBeInTheDocument();
  });

  it('shows validation error for empty date and does not submit', () => {
    const onSubmit = jest.fn();

    render(
      <TransactionModal
        {...defaultProps}
        isOpen={true}
        onSubmit={onSubmit}
      />,
    );

    fireEvent.change(screen.getByLabelText('Amount'), {
      target: { value: '10' },
    });
    fireEvent.change(screen.getByLabelText('Description'), {
      target: { value: 'Something' },
    });
    fireEvent.change(screen.getByLabelText('Date'), {
      target: { value: '' },
    });

    fireEvent.click(screen.getByRole('button', { name: 'Create Transaction' }));

    expect(onSubmit).not.toHaveBeenCalled();
    expect(screen.getByText('Date is required.')).toBeInTheDocument();
  });

  // ---------------------------------------------------------------------------
  // Type toggle
  // ---------------------------------------------------------------------------

  it('defaults to expense type in create mode', async () => {
    const onSubmit = jest.fn().mockResolvedValue(undefined);

    render(
      <TransactionModal
        {...defaultProps}
        isOpen={true}
        onSubmit={onSubmit}
      />,
    );

    fireEvent.change(screen.getByLabelText('Amount'), {
      target: { value: '25' },
    });
    fireEvent.change(screen.getByLabelText('Description'), {
      target: { value: 'Lunch' },
    });

    fireEvent.click(screen.getByRole('button', { name: 'Create Transaction' }));

    await waitFor(() => {
      expect(onSubmit).toHaveBeenCalledTimes(1);
    });
    expect(onSubmit).toHaveBeenCalledWith(
      expect.objectContaining({ type: 'expense' }),
    );
  });

  it('switches to income type and submits with correct type', async () => {
    const onSubmit = jest.fn().mockResolvedValue(undefined);

    render(
      <TransactionModal
        {...defaultProps}
        isOpen={true}
        onSubmit={onSubmit}
      />,
    );

    fireEvent.click(screen.getByRole('button', { name: 'Income' }));

    fireEvent.change(screen.getByLabelText('Amount'), {
      target: { value: '2000' },
    });
    fireEvent.change(screen.getByLabelText('Description'), {
      target: { value: 'Contract payment' },
    });

    fireEvent.click(screen.getByRole('button', { name: 'Create Transaction' }));

    await waitFor(() => {
      expect(onSubmit).toHaveBeenCalledTimes(1);
    });
    expect(onSubmit).toHaveBeenCalledWith(
      expect.objectContaining({ type: 'income', amount: 2000 }),
    );
  });

  it('toggles back to expense after switching to income', async () => {
    const onSubmit = jest.fn().mockResolvedValue(undefined);

    render(
      <TransactionModal
        {...defaultProps}
        isOpen={true}
        onSubmit={onSubmit}
      />,
    );

    // Switch to income, then back to expense
    fireEvent.click(screen.getByRole('button', { name: 'Income' }));
    fireEvent.click(screen.getByRole('button', { name: 'Expense' }));

    fireEvent.change(screen.getByLabelText('Amount'), {
      target: { value: '15' },
    });
    fireEvent.change(screen.getByLabelText('Description'), {
      target: { value: 'Coffee' },
    });

    fireEvent.click(screen.getByRole('button', { name: 'Create Transaction' }));

    await waitFor(() => {
      expect(onSubmit).toHaveBeenCalledTimes(1);
    });
    expect(onSubmit).toHaveBeenCalledWith(
      expect.objectContaining({ type: 'expense' }),
    );
  });

  // ---------------------------------------------------------------------------
  // Category integration — onCreateCategory receives correct type
  // ---------------------------------------------------------------------------

  it('passes expense type to onCreateCategory when form type is expense', async () => {
    const newCategory: Category = {
      id: 'cat-new-expense',
      userId: 'user-1',
      name: 'Groceries',
      color: '#FFE66D',
      type: 'expense',
      isFallback: false,
      createdAt: new Date(),
      updatedAt: new Date(),
    };
    const onCreateCategory = jest.fn().mockResolvedValue(newCategory);

    render(
      <TransactionModal
        {...defaultProps}
        isOpen={true}
        onCreateCategory={onCreateCategory}
      />,
    );

    // Interact with the CategorySelect to create a new category
    const categoryInput = screen.getByPlaceholderText('Search or create category...');
    fireEvent.focus(categoryInput);
    fireEvent.change(categoryInput, { target: { value: 'Groceries' } });

    await waitFor(() => {
      expect(screen.getByText('Create "Groceries"')).toBeInTheDocument();
    });

    fireEvent.click(screen.getByText('Create "Groceries"'));

    await waitFor(() => {
      expect(onCreateCategory).toHaveBeenCalledWith(
        'Groceries',
        'expense',
        expect.any(String),
      );
    });
  });

  it('passes income type to onCreateCategory when form type is income', async () => {
    const newCategory: Category = {
      id: 'cat-new-income',
      userId: 'user-1',
      name: 'Freelance',
      color: '#FFE66D',
      type: 'income',
      isFallback: false,
      createdAt: new Date(),
      updatedAt: new Date(),
    };
    const onCreateCategory = jest.fn().mockResolvedValue(newCategory);

    render(
      <TransactionModal
        {...defaultProps}
        isOpen={true}
        onCreateCategory={onCreateCategory}
      />,
    );

    // Switch type to income first
    fireEvent.click(screen.getByRole('button', { name: 'Income' }));

    // Now create a category — should receive type 'income'
    const categoryInput = screen.getByPlaceholderText('Search or create category...');
    fireEvent.focus(categoryInput);
    fireEvent.change(categoryInput, { target: { value: 'Freelance' } });

    await waitFor(() => {
      expect(screen.getByText('Create "Freelance"')).toBeInTheDocument();
    });

    fireEvent.click(screen.getByText('Create "Freelance"'));

    await waitFor(() => {
      expect(onCreateCategory).toHaveBeenCalledWith(
        'Freelance',
        'income',
        expect.any(String),
      );
    });
  });

  // ---------------------------------------------------------------------------
  // Submit error display
  // ---------------------------------------------------------------------------

  it('displays submit error when onSubmit rejects', async () => {
    const onSubmit = jest.fn().mockRejectedValue(new Error('Network failure'));

    render(
      <TransactionModal
        {...defaultProps}
        isOpen={true}
        onSubmit={onSubmit}
      />,
    );

    fireEvent.change(screen.getByLabelText('Amount'), {
      target: { value: '50' },
    });
    fireEvent.change(screen.getByLabelText('Description'), {
      target: { value: 'Internet bill' },
    });

    fireEvent.click(screen.getByRole('button', { name: 'Create Transaction' }));

    await waitFor(() => {
      expect(screen.getByText('Network failure')).toBeInTheDocument();
    });

    expect(onSubmit).toHaveBeenCalledTimes(1);
  });

  it('displays fallback submit error message for non-Error rejections', async () => {
    // eslint-disable-next-line prefer-promise-reject-errors
    const onSubmit = jest.fn().mockRejectedValue('Unknown error');

    render(
      <TransactionModal
        {...defaultProps}
        isOpen={true}
        onSubmit={onSubmit}
      />,
    );

    fireEvent.change(screen.getByLabelText('Amount'), {
      target: { value: '50' },
    });
    fireEvent.change(screen.getByLabelText('Description'), {
      target: { value: 'Internet bill' },
    });

    fireEvent.click(screen.getByRole('button', { name: 'Create Transaction' }));

    await waitFor(() => {
      expect(screen.getByText('Submission failed.')).toBeInTheDocument();
    });
  });
});
