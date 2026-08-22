import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { TransactionForm } from '../src/components/transactions/TransactionForm';
import type { Category } from '@mercury/shared';

const mockCategories: Category[] = [
  {
    id: 'cat-1',
    userId: 'u1',
    name: 'Food',
    color: '#FF6B6B',
    type: 'expense',
    isFallback: false,
    createdAt: new Date(),
    updatedAt: new Date(),
  },
  {
    id: 'cat-2',
    userId: 'u1',
    name: 'Salary',
    color: '#2ECC71',
    type: 'income',
    isFallback: false,
    createdAt: new Date(),
    updatedAt: new Date(),
  },
];

describe('TransactionForm', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('renders in create mode with empty form fields', () => {
    render(
      <TransactionForm
        categories={mockCategories}
        onCreateCategory={jest.fn()}
        onSubmit={jest.fn()}
        onCancel={jest.fn()}
      />,
    );

    const amountInput = screen.getByLabelText('Amount') as HTMLInputElement;
    expect(amountInput.value).toBe('');

    const descriptionInput = screen.getByLabelText('Description') as HTMLInputElement;
    expect(descriptionInput.value).toBe('');

    const dateInput = screen.getByLabelText('Date') as HTMLInputElement;
    const today = new Date().toISOString().split('T')[0];
    expect(dateInput.value).toBe(today);

    expect(screen.getByRole('button', { name: 'Create Transaction' })).toBeInTheDocument();
  });

  it('renders in edit mode with pre-filled form fields', () => {
    render(
      <TransactionForm
        initialValues={{
          type: 'income',
          amount: 42.5,
          description: 'Freelance payment',
          date: '2025-03-10',
          categoryId: 'cat-2',
        }}
        categories={mockCategories}
        onCreateCategory={jest.fn()}
        onSubmit={jest.fn()}
        onCancel={jest.fn()}
      />,
    );

    const amountInput = screen.getByLabelText('Amount') as HTMLInputElement;
    expect(amountInput.value).toBe('42.5');

    const descriptionInput = screen.getByLabelText('Description') as HTMLInputElement;
    expect(descriptionInput.value).toBe('Freelance payment');

    const dateInput = screen.getByLabelText('Date') as HTMLInputElement;
    expect(dateInput.value).toBe('2025-03-10');

    expect(screen.getByRole('button', { name: 'Save Changes' })).toBeInTheDocument();
  });

  it('defaults type toggle to expense', () => {
    render(
      <TransactionForm
        categories={mockCategories}
        onCreateCategory={jest.fn()}
        onSubmit={jest.fn()}
        onCancel={jest.fn()}
      />,
    );

    const categoryInput = screen.getByPlaceholderText('Search or create category...');
    fireEvent.focus(categoryInput);

    expect(screen.getByText('Food')).toBeInTheDocument();
    expect(screen.queryByText('Salary')).not.toBeInTheDocument();
  });

  it('toggles between income and expense types', () => {
    render(
      <TransactionForm
        categories={mockCategories}
        onCreateCategory={jest.fn()}
        onSubmit={jest.fn()}
        onCancel={jest.fn()}
      />,
    );

    fireEvent.click(screen.getByRole('button', { name: 'Income' }));

    const categoryInput = screen.getByPlaceholderText('Search or create category...');
    fireEvent.focus(categoryInput);

    expect(screen.getByText('Salary')).toBeInTheDocument();
    expect(screen.queryByText('Food')).not.toBeInTheDocument();
  });

  it('submits form with valid data in create mode', async () => {
    const onSubmit = jest.fn().mockResolvedValue(undefined);

    render(
      <TransactionForm
        categories={mockCategories}
        onCreateCategory={jest.fn()}
        onSubmit={onSubmit}
        onCancel={jest.fn()}
      />,
    );

    fireEvent.change(screen.getByLabelText('Amount'), { target: { value: '50' } });
    fireEvent.change(screen.getByLabelText('Description'), { target: { value: 'Coffee' } });
    fireEvent.change(screen.getByLabelText('Date'), { target: { value: '2025-01-15' } });

    fireEvent.click(screen.getByRole('button', { name: 'Create Transaction' }));

    await waitFor(() => {
      expect(onSubmit).toHaveBeenCalledTimes(1);
    });

    expect(onSubmit).toHaveBeenCalledWith({
      type: 'expense',
      amount: 50,
      description: 'Coffee',
      date: '2025-01-15',
      categoryId: undefined,
    });
  });

  it('submits form with valid data in edit mode', async () => {
    const onSubmit = jest.fn().mockResolvedValue(undefined);

    render(
      <TransactionForm
        initialValues={{
          type: 'income',
          amount: 100,
          description: 'Salary',
          date: '2025-02-01',
          categoryId: 'cat-2',
        }}
        categories={mockCategories}
        onCreateCategory={jest.fn()}
        onSubmit={onSubmit}
        onCancel={jest.fn()}
      />,
    );

    fireEvent.change(screen.getByLabelText('Amount'), { target: { value: '150' } });
    fireEvent.change(screen.getByLabelText('Description'), { target: { value: 'Bonus' } });

    fireEvent.click(screen.getByRole('button', { name: 'Save Changes' }));

    await waitFor(() => {
      expect(onSubmit).toHaveBeenCalledTimes(1);
    });

    expect(onSubmit).toHaveBeenCalledWith({
      type: 'income',
      amount: 150,
      description: 'Bonus',
      date: '2025-02-01',
      categoryId: 'cat-2',
    });
  });

  it('shows validation error when amount is empty', () => {
    render(
      <TransactionForm
        categories={mockCategories}
        onCreateCategory={jest.fn()}
        onSubmit={jest.fn()}
        onCancel={jest.fn()}
      />,
    );

    fireEvent.change(screen.getByLabelText('Amount'), { target: { value: '' } });
    fireEvent.change(screen.getByLabelText('Description'), { target: { value: 'Coffee' } });
    fireEvent.change(screen.getByLabelText('Date'), { target: { value: '2025-01-15' } });

    fireEvent.submit(screen.getByRole('button', { name: 'Create Transaction' }).closest('form')!);

    expect(screen.getByText('Please enter a valid positive amount.')).toBeInTheDocument();
  });

  it('shows validation error when amount is 0 or negative', () => {
    render(
      <TransactionForm
        categories={mockCategories}
        onCreateCategory={jest.fn()}
        onSubmit={jest.fn()}
        onCancel={jest.fn()}
      />,
    );

    fireEvent.change(screen.getByLabelText('Amount'), { target: { value: '0' } });
    fireEvent.change(screen.getByLabelText('Description'), { target: { value: 'Coffee' } });
    fireEvent.change(screen.getByLabelText('Date'), { target: { value: '2025-01-15' } });

    fireEvent.submit(screen.getByRole('button', { name: 'Create Transaction' }).closest('form')!);

    expect(screen.getByText('Please enter a valid positive amount.')).toBeInTheDocument();
  });

  it('shows validation error when description is empty', () => {
    render(
      <TransactionForm
        categories={mockCategories}
        onCreateCategory={jest.fn()}
        onSubmit={jest.fn()}
        onCancel={jest.fn()}
      />,
    );

    fireEvent.change(screen.getByLabelText('Amount'), { target: { value: '50' } });
    fireEvent.change(screen.getByLabelText('Description'), { target: { value: '' } });
    fireEvent.change(screen.getByLabelText('Date'), { target: { value: '2025-01-15' } });

    fireEvent.submit(screen.getByRole('button', { name: 'Create Transaction' }).closest('form')!);

    expect(screen.getByText('Description is required.')).toBeInTheDocument();
  });

  it('shows validation error when date is empty', () => {
    render(
      <TransactionForm
        categories={mockCategories}
        onCreateCategory={jest.fn()}
        onSubmit={jest.fn()}
        onCancel={jest.fn()}
      />,
    );

    fireEvent.change(screen.getByLabelText('Amount'), { target: { value: '50' } });
    fireEvent.change(screen.getByLabelText('Description'), { target: { value: 'Coffee' } });
    fireEvent.change(screen.getByLabelText('Date'), { target: { value: '' } });

    fireEvent.submit(screen.getByRole('button', { name: 'Create Transaction' }).closest('form')!);

    expect(screen.getByText('Date is required.')).toBeInTheDocument();
  });

  it('does not call onSubmit when all fields are empty', () => {
    const onSubmit = jest.fn();

    render(
      <TransactionForm
        categories={mockCategories}
        onCreateCategory={jest.fn()}
        onSubmit={onSubmit}
        onCancel={jest.fn()}
      />,
    );

    fireEvent.change(screen.getByLabelText('Amount'), { target: { value: '' } });
    fireEvent.change(screen.getByLabelText('Description'), { target: { value: '' } });
    fireEvent.change(screen.getByLabelText('Date'), { target: { value: '' } });

    fireEvent.submit(screen.getByRole('button', { name: 'Create Transaction' }).closest('form')!);

    expect(onSubmit).not.toHaveBeenCalled();
    expect(screen.getByText('Please enter a valid positive amount.')).toBeInTheDocument();
    expect(screen.getByText('Description is required.')).toBeInTheDocument();
    expect(screen.getByText('Date is required.')).toBeInTheDocument();
  });

  it('disables submit button and shows spinner when submitting', async () => {
    const onSubmit = jest.fn().mockImplementation(() => new Promise(() => {}));

    render(
      <TransactionForm
        categories={mockCategories}
        onCreateCategory={jest.fn()}
        onSubmit={onSubmit}
        onCancel={jest.fn()}
      />,
    );

    fireEvent.change(screen.getByLabelText('Amount'), { target: { value: '50' } });
    fireEvent.change(screen.getByLabelText('Description'), { target: { value: 'Coffee' } });
    fireEvent.change(screen.getByLabelText('Date'), { target: { value: '2025-01-15' } });

    fireEvent.click(screen.getByRole('button', { name: 'Create Transaction' }));

    await waitFor(() => {
      const submitButton = screen.getByRole('button', { name: 'Create Transaction' });
      expect(submitButton).toBeDisabled();
    });

    const submitButton = screen.getByRole('button', { name: 'Create Transaction' });
    const svg = submitButton.querySelector('svg');
    expect(svg).not.toBeNull();
  });

  it('calls onCancel when Cancel button is clicked', () => {
    const onCancel = jest.fn();

    render(
      <TransactionForm
        categories={mockCategories}
        onCreateCategory={jest.fn()}
        onSubmit={jest.fn()}
        onCancel={onCancel}
      />,
    );

    fireEvent.click(screen.getByRole('button', { name: 'Cancel' }));

    expect(onCancel).toHaveBeenCalledTimes(1);
  });

  it('integrates with CategorySelect by passing correct type and calling onCreateCategory', async () => {
    const newCategory: Category = {
      id: 'cat-new',
      userId: 'u1',
      name: 'Groceries',
      color: '#FFE66D',
      type: 'expense',
      isFallback: false,
      createdAt: new Date(),
      updatedAt: new Date(),
    };
    const onCreateCategory = jest.fn().mockResolvedValue(newCategory);

    render(
      <TransactionForm
        categories={mockCategories}
        onCreateCategory={onCreateCategory}
        onSubmit={jest.fn()}
        onCancel={jest.fn()}
      />,
    );

    const categoryInput = screen.getByPlaceholderText('Search or create category...');
    fireEvent.focus(categoryInput);
    fireEvent.change(categoryInput, { target: { value: 'Groceries' } });

    await waitFor(() => {
      expect(screen.getByText('Create "Groceries"')).toBeInTheDocument();
    });

    fireEvent.click(screen.getByText('Create "Groceries"'));

    await waitFor(() => {
      expect(onCreateCategory).toHaveBeenCalledWith('Groceries', 'expense', expect.any(String));
    });
  });

  it('shows the Recurring? toggle in create mode but not in edit mode', () => {
    const { rerender } = render(
      <TransactionForm
        categories={mockCategories}
        onCreateCategory={jest.fn()}
        onSubmit={jest.fn()}
        onCancel={jest.fn()}
      />,
    );

    expect(screen.getByLabelText('Recurring?')).toBeInTheDocument();

    rerender(
      <TransactionForm
        initialValues={{
          type: 'expense',
          amount: 50,
          description: 'Coffee',
          date: '2025-01-15',
        }}
        categories={mockCategories}
        onCreateCategory={jest.fn()}
        onSubmit={jest.fn()}
        onCancel={jest.fn()}
      />,
    );

    expect(screen.queryByLabelText('Recurring?')).not.toBeInTheDocument();
  });

  it('reveals recurring fields when the Recurring? toggle is on', () => {
    render(
      <TransactionForm
        categories={mockCategories}
        onCreateCategory={jest.fn()}
        onSubmit={jest.fn()}
        onCancel={jest.fn()}
      />,
    );

    expect(screen.queryByLabelText(/Frequency/i)).not.toBeInTheDocument();
    expect(screen.queryByLabelText(/Interval/i)).not.toBeInTheDocument();
    expect(screen.queryByLabelText(/End date/i)).not.toBeInTheDocument();

    fireEvent.click(screen.getByLabelText('Recurring?'));

    expect(screen.getByLabelText(/Frequency/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/Interval/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/End date/i)).toBeInTheDocument();
  });

  it('shows dayOfMonth for monthly frequency and dayOfWeek for weekly frequency', () => {
    render(
      <TransactionForm
        categories={mockCategories}
        onCreateCategory={jest.fn()}
        onSubmit={jest.fn()}
        onCancel={jest.fn()}
      />,
    );

    fireEvent.click(screen.getByLabelText('Recurring?'));

    expect(screen.getByLabelText(/Day of month/i)).toBeInTheDocument();
    expect(screen.queryByLabelText(/Day of week/i)).not.toBeInTheDocument();

    fireEvent.change(screen.getByLabelText(/Frequency/i), { target: { value: 'weekly' } });

    expect(screen.queryByLabelText(/Day of month/i)).not.toBeInTheDocument();
    expect(screen.getByLabelText(/Day of week/i)).toBeInTheDocument();
  });

  it('shows the subscription checkbox only for recurring expenses', () => {
    render(
      <TransactionForm
        categories={mockCategories}
        onCreateCategory={jest.fn()}
        onSubmit={jest.fn()}
        onCancel={jest.fn()}
      />,
    );

    expect(screen.queryByLabelText('Mark as subscription')).not.toBeInTheDocument();

    fireEvent.click(screen.getByLabelText('Recurring?'));
    expect(screen.getByLabelText('Mark as subscription')).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: 'Income' }));
    expect(screen.queryByLabelText('Mark as subscription')).not.toBeInTheDocument();
  });

  it('reveals the service type select when Mark as subscription is checked', () => {
    render(
      <TransactionForm
        categories={mockCategories}
        onCreateCategory={jest.fn()}
        onSubmit={jest.fn()}
        onCancel={jest.fn()}
      />,
    );

    fireEvent.click(screen.getByLabelText('Recurring?'));
    expect(screen.queryByLabelText(/Service type/i)).not.toBeInTheDocument();

    fireEvent.click(screen.getByLabelText('Mark as subscription'));
    expect(screen.getByLabelText(/Service type/i)).toBeInTheDocument();
  });

  it('submits recurring fields when Recurring? is checked', async () => {
    const onSubmit = jest.fn().mockResolvedValue(undefined);

    render(
      <TransactionForm
        categories={mockCategories}
        onCreateCategory={jest.fn()}
        onSubmit={onSubmit}
        onCancel={jest.fn()}
      />,
    );

    fireEvent.change(screen.getByLabelText('Amount'), { target: { value: '100' } });
    fireEvent.change(screen.getByLabelText('Description'), { target: { value: 'Rent' } });
    fireEvent.change(screen.getByLabelText('Date'), { target: { value: '2025-01-01' } });
    fireEvent.click(screen.getByLabelText('Recurring?'));
    fireEvent.change(screen.getByLabelText(/Interval/i), { target: { value: '2' } });
    fireEvent.change(screen.getByLabelText(/Day of month/i), { target: { value: '15' } });

    fireEvent.click(screen.getByRole('button', { name: 'Create Recurring' }));

    await waitFor(() => {
      expect(onSubmit).toHaveBeenCalledTimes(1);
    });

    expect(onSubmit).toHaveBeenCalledWith({
      type: 'expense',
      amount: 100,
      description: 'Rent',
      date: '2025-01-01',
      categoryId: undefined,
      isRecurring: true,
      frequency: 'monthly',
      interval: 2,
      dayOfMonth: 15,
    });
  });

  it('submits subscription fields when Mark as subscription is checked', async () => {
    const onSubmit = jest.fn().mockResolvedValue(undefined);

    render(
      <TransactionForm
        categories={mockCategories}
        onCreateCategory={jest.fn()}
        onSubmit={onSubmit}
        onCancel={jest.fn()}
      />,
    );

    fireEvent.change(screen.getByLabelText('Amount'), { target: { value: '15' } });
    fireEvent.change(screen.getByLabelText('Description'), { target: { value: 'Netflix' } });
    fireEvent.change(screen.getByLabelText('Date'), { target: { value: '2025-01-01' } });
    fireEvent.click(screen.getByLabelText('Recurring?'));
    fireEvent.click(screen.getByLabelText('Mark as subscription'));

    fireEvent.click(screen.getByRole('button', { name: 'Create Recurring' }));

    await waitFor(() => {
      expect(onSubmit).toHaveBeenCalledTimes(1);
    });

    expect(onSubmit).toHaveBeenCalledWith({
      type: 'expense',
      amount: 15,
      description: 'Netflix',
      date: '2025-01-01',
      categoryId: undefined,
      isRecurring: true,
      frequency: 'monthly',
      interval: 1,
      isSubscription: true,
      serviceType: 'streaming',
    });
  });

  it('validates recurring fields when Recurring? is checked', async () => {
    render(
      <TransactionForm
        categories={mockCategories}
        onCreateCategory={jest.fn()}
        onSubmit={jest.fn()}
        onCancel={jest.fn()}
      />,
    );

    fireEvent.change(screen.getByLabelText('Amount'), { target: { value: '50' } });
    fireEvent.change(screen.getByLabelText('Description'), { target: { value: 'Gym' } });
    fireEvent.change(screen.getByLabelText('Date'), { target: { value: '2025-01-01' } });
    fireEvent.click(screen.getByLabelText('Recurring?'));
    fireEvent.change(screen.getByLabelText(/Interval/i), { target: { value: '0' } });

    fireEvent.submit(screen.getByRole('button', { name: 'Create Recurring' }).closest('form')!);

    await waitFor(() => {
      expect(screen.getByText('Interval must be at least 1.')).toBeInTheDocument();
    });
  });
});
