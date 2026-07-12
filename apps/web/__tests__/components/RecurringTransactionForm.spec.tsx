import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { RecurringTransactionForm } from '../../src/components/transactions/RecurringTransactionForm';
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

describe('RecurringTransactionForm', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('renders in create mode with default values', () => {
    render(
      <RecurringTransactionForm
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

    const dateInput = screen.getByLabelText('Start date') as HTMLInputElement;
    const today = new Date().toISOString().split('T')[0];
    expect(dateInput.value).toBe(today);

    const frequencySelect = screen.getByLabelText('Frequency') as HTMLSelectElement;
    expect(frequencySelect.value).toBe('monthly');

    const intervalInput = screen.getByLabelText('Interval') as HTMLInputElement;
    expect(intervalInput.value).toBe('1');

    expect(screen.getByRole('button', { name: 'Create Recurring' })).toBeInTheDocument();
  });

  it('renders in edit mode with pre-filled values', () => {
    render(
      <RecurringTransactionForm
        initialValues={{
          type: 'income',
          amount: 2500,
          description: 'Salary',
          date: '2025-01-15',
          frequency: 'monthly',
          interval: 1,
          dayOfMonth: 15,
          categoryId: 'cat-2',
        }}
        categories={mockCategories}
        onCreateCategory={jest.fn()}
        onSubmit={jest.fn()}
        onCancel={jest.fn()}
      />,
    );

    expect((screen.getByLabelText('Amount') as HTMLInputElement).value).toBe('2500');
    expect((screen.getByLabelText('Description') as HTMLInputElement).value).toBe('Salary');
    expect((screen.getByLabelText('Start date') as HTMLInputElement).value).toBe('2025-01-15');
    expect((screen.getByLabelText('Frequency') as HTMLSelectElement).value).toBe('monthly');
    expect((screen.getByLabelText('Interval') as HTMLInputElement).value).toBe('1');
    expect((screen.getByLabelText(/Day of month/) as HTMLInputElement).value).toBe('15');
    expect(screen.getByRole('button', { name: 'Save Changes' })).toBeInTheDocument();
  });

  it('shows day of month field only for monthly frequency', () => {
    render(
      <RecurringTransactionForm
        categories={mockCategories}
        onCreateCategory={jest.fn()}
        onSubmit={jest.fn()}
        onCancel={jest.fn()}
      />,
    );

    expect(screen.getByLabelText(/Day of month/)).toBeInTheDocument();
    expect(screen.queryByLabelText(/Day of week/)).not.toBeInTheDocument();

    fireEvent.change(screen.getByLabelText('Frequency'), { target: { value: 'weekly' } });

    expect(screen.queryByLabelText(/Day of month/)).not.toBeInTheDocument();
    expect(screen.getByLabelText(/Day of week/)).toBeInTheDocument();

    fireEvent.change(screen.getByLabelText('Frequency'), { target: { value: 'daily' } });

    expect(screen.queryByLabelText(/Day of month/)).not.toBeInTheDocument();
    expect(screen.queryByLabelText(/Day of week/)).not.toBeInTheDocument();
  });

  it('submits form with valid data in create mode', async () => {
    const onSubmit = jest.fn().mockResolvedValue(undefined);

    render(
      <RecurringTransactionForm
        categories={mockCategories}
        onCreateCategory={jest.fn()}
        onSubmit={onSubmit}
        onCancel={jest.fn()}
      />,
    );

    fireEvent.change(screen.getByLabelText('Amount'), { target: { value: '100' } });
    fireEvent.change(screen.getByLabelText('Description'), { target: { value: 'Rent' } });
    fireEvent.change(screen.getByLabelText('Start date'), { target: { value: '2025-01-01' } });
    fireEvent.change(screen.getByLabelText('Frequency'), { target: { value: 'monthly' } });
    fireEvent.change(screen.getByLabelText('Interval'), { target: { value: '1' } });
    fireEvent.change(screen.getByLabelText(/Day of month/), { target: { value: '1' } });

    fireEvent.click(screen.getByRole('button', { name: 'Create Recurring' }));

    await waitFor(() => {
      expect(onSubmit).toHaveBeenCalledTimes(1);
    });

    expect(onSubmit).toHaveBeenCalledWith({
      type: 'expense',
      amount: 100,
      description: 'Rent',
      date: '2025-01-01',
      frequency: 'monthly',
      interval: 1,
      dayOfMonth: 1,
      categoryId: undefined,
    });
  });

  it('submits form with valid data in edit mode', async () => {
    const onSubmit = jest.fn().mockResolvedValue(undefined);

    render(
      <RecurringTransactionForm
        initialValues={{
          type: 'income',
          amount: 2500,
          description: 'Salary',
          date: '2025-01-15',
          frequency: 'monthly',
          interval: 1,
          categoryId: 'cat-2',
        }}
        categories={mockCategories}
        onCreateCategory={jest.fn()}
        onSubmit={onSubmit}
        onCancel={jest.fn()}
      />,
    );

    fireEvent.change(screen.getByLabelText('Amount'), { target: { value: '2600' } });

    fireEvent.click(screen.getByRole('button', { name: 'Save Changes' }));

    await waitFor(() => {
      expect(onSubmit).toHaveBeenCalledTimes(1);
    });

    expect(onSubmit).toHaveBeenCalledWith({
      type: 'income',
      amount: 2600,
      description: 'Salary',
      date: '2025-01-15',
      frequency: 'monthly',
      interval: 1,
      categoryId: 'cat-2',
    });
  });

  it('shows validation error when amount is invalid', () => {
    render(
      <RecurringTransactionForm
        categories={mockCategories}
        onCreateCategory={jest.fn()}
        onSubmit={jest.fn()}
        onCancel={jest.fn()}
      />,
    );

    fireEvent.change(screen.getByLabelText('Amount'), { target: { value: '0' } });
    fireEvent.change(screen.getByLabelText('Description'), { target: { value: 'Rent' } });

    fireEvent.submit(screen.getByRole('button', { name: 'Create Recurring' }).closest('form')!);

    expect(screen.getByText('Please enter a valid positive amount.')).toBeInTheDocument();
  });

  it('shows validation error when description is empty', () => {
    render(
      <RecurringTransactionForm
        categories={mockCategories}
        onCreateCategory={jest.fn()}
        onSubmit={jest.fn()}
        onCancel={jest.fn()}
      />,
    );

    fireEvent.change(screen.getByLabelText('Amount'), { target: { value: '100' } });
    fireEvent.change(screen.getByLabelText('Description'), { target: { value: '' } });

    fireEvent.submit(screen.getByRole('button', { name: 'Create Recurring' }).closest('form')!);

    expect(screen.getByText('Description is required.')).toBeInTheDocument();
  });

  it('shows validation error when interval is less than 1', () => {
    render(
      <RecurringTransactionForm
        categories={mockCategories}
        onCreateCategory={jest.fn()}
        onSubmit={jest.fn()}
        onCancel={jest.fn()}
      />,
    );

    fireEvent.change(screen.getByLabelText('Amount'), { target: { value: '100' } });
    fireEvent.change(screen.getByLabelText('Description'), { target: { value: 'Rent' } });
    fireEvent.change(screen.getByLabelText('Interval'), { target: { value: '0' } });

    fireEvent.submit(screen.getByRole('button', { name: 'Create Recurring' }).closest('form')!);

    expect(screen.getByText('Interval must be at least 1.')).toBeInTheDocument();
  });

  it('shows validation error when day of month is out of range', () => {
    render(
      <RecurringTransactionForm
        categories={mockCategories}
        onCreateCategory={jest.fn()}
        onSubmit={jest.fn()}
        onCancel={jest.fn()}
      />,
    );

    fireEvent.change(screen.getByLabelText('Amount'), { target: { value: '100' } });
    fireEvent.change(screen.getByLabelText('Description'), { target: { value: 'Rent' } });
    fireEvent.change(screen.getByLabelText(/Day of month/), { target: { value: '32' } });

    fireEvent.submit(screen.getByRole('button', { name: 'Create Recurring' }).closest('form')!);

    expect(screen.getByText('Day of month must be between 1 and 31.')).toBeInTheDocument();
  });

  it('shows validation error when end date is before start date', () => {
    render(
      <RecurringTransactionForm
        categories={mockCategories}
        onCreateCategory={jest.fn()}
        onSubmit={jest.fn()}
        onCancel={jest.fn()}
      />,
    );

    fireEvent.change(screen.getByLabelText('Amount'), { target: { value: '100' } });
    fireEvent.change(screen.getByLabelText('Description'), { target: { value: 'Rent' } });
    fireEvent.change(screen.getByLabelText('Start date'), { target: { value: '2025-02-01' } });
    fireEvent.change(screen.getByLabelText(/End date/), { target: { value: '2025-01-01' } });

    fireEvent.submit(screen.getByRole('button', { name: 'Create Recurring' }).closest('form')!);

    expect(screen.getByText('End date must be after start date.')).toBeInTheDocument();
  });

  it('calls onCancel when Cancel button is clicked', () => {
    const onCancel = jest.fn();

    render(
      <RecurringTransactionForm
        categories={mockCategories}
        onCreateCategory={jest.fn()}
        onSubmit={jest.fn()}
        onCancel={onCancel}
      />,
    );

    fireEvent.click(screen.getByRole('button', { name: 'Cancel' }));

    expect(onCancel).toHaveBeenCalledTimes(1);
  });

  it('integrates with CategorySelect by creating a new category', async () => {
    const newCategory: Category = {
      id: 'cat-new',
      userId: 'u1',
      name: 'Utilities',
      color: '#FFE66D',
      type: 'expense',
      isFallback: false,
      createdAt: new Date(),
      updatedAt: new Date(),
    };
    const onCreateCategory = jest.fn().mockResolvedValue(newCategory);

    render(
      <RecurringTransactionForm
        categories={mockCategories}
        onCreateCategory={onCreateCategory}
        onSubmit={jest.fn()}
        onCancel={jest.fn()}
      />,
    );

    const categoryInput = screen.getByPlaceholderText('Search or create category...');
    fireEvent.focus(categoryInput);
    fireEvent.change(categoryInput, { target: { value: 'Utilities' } });

    await waitFor(() => {
      expect(screen.getByText('Create "Utilities"')).toBeInTheDocument();
    });

    fireEvent.click(screen.getByText('Create "Utilities"'));

    await waitFor(() => {
      expect(onCreateCategory).toHaveBeenCalledWith('Utilities', 'expense', expect.any(String));
    });
  });
});
