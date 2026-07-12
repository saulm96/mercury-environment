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
});
