import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { BudgetForm } from '../src/components/budgets/BudgetForm';
import type { Budget, Category } from '@mercury/shared';

const mockCategories: Category[] = [
  {
    id: 'cat-1',
    userId: 'u1',
    name: 'Alquiler',
    color: '#FF6B6B',
    type: 'expense',
    isFallback: false,
    createdAt: new Date('2025-01-01'),
    updatedAt: new Date('2025-01-01'),
  },
  {
    id: 'cat-2',
    userId: 'u1',
    name: 'Comida',
    color: '#2ECC71',
    type: 'expense',
    isFallback: false,
    createdAt: new Date('2025-01-02'),
    updatedAt: new Date('2025-01-02'),
  },
  {
    id: 'cat-3',
    userId: 'u1',
    name: 'Netflix',
    color: '#3498DB',
    type: 'expense',
    isFallback: true,
    createdAt: new Date('2025-01-03'),
    updatedAt: new Date('2025-01-03'),
  },
  {
    id: 'cat-4',
    userId: 'u1',
    name: 'Salary',
    color: '#9B59B6',
    type: 'income',
    isFallback: false,
    createdAt: new Date('2025-01-04'),
    updatedAt: new Date('2025-01-04'),
  },
];

const mockBudget: Budget = {
  id: 'budget-1',
  userId: 'u1',
  name: 'Vivienda',
  value: 500,
  period: 'monthly',
  categories: [mockCategories[0], mockCategories[1]],
  createdAt: new Date('2025-01-01'),
  updatedAt: new Date('2025-01-01'),
};

describe('BudgetForm', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('renders form fields in create mode with empty values', () => {
    render(
      <BudgetForm
        categories={mockCategories}
        onSubmit={jest.fn()}
        onCancel={jest.fn()}
      />,
    );

    const nameInput = screen.getByLabelText('Name') as HTMLInputElement;
    expect(nameInput.value).toBe('');

    const valueInput = screen.getByLabelText('Value (€)') as HTMLInputElement;
    expect(valueInput.value).toBe('');

    expect(screen.getByRole('button', { name: 'Save Budget' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Cancel' })).toBeInTheDocument();

    for (const category of mockCategories.filter((c) => c.type === 'expense')) {
      expect(screen.getByText(category.name)).toBeInTheDocument();
    }
  });

  it('renders form in edit mode with pre-filled budget data', () => {
    render(
      <BudgetForm
        budget={mockBudget}
        categories={mockCategories}
        onSubmit={jest.fn()}
        onCancel={jest.fn()}
      />,
    );

    const nameInput = screen.getByLabelText('Name') as HTMLInputElement;
    expect(nameInput.value).toBe('Vivienda');

    const valueInput = screen.getByLabelText('Value (€)') as HTMLInputElement;
    expect(valueInput.value).toBe('500');

    expect(screen.getByRole('button', { name: 'Save Changes' })).toBeInTheDocument();
  });

  it('does not show income categories', () => {
    render(
      <BudgetForm
        categories={mockCategories}
        onSubmit={jest.fn()}
        onCancel={jest.fn()}
      />,
    );

    expect(screen.getByText('Alquiler')).toBeInTheDocument();
    expect(screen.getByText('Comida')).toBeInTheDocument();
    expect(screen.getByText('Netflix')).toBeInTheDocument();
    expect(screen.queryByText('Salary')).not.toBeInTheDocument();
  });

  it('shows validation errors when submitting an empty form', () => {
    render(
      <BudgetForm
        categories={mockCategories}
        onSubmit={jest.fn()}
        onCancel={jest.fn()}
      />,
    );

    fireEvent.click(screen.getByRole('button', { name: 'Save Budget' }));

    expect(screen.getByText('Name is required.')).toBeInTheDocument();
    expect(screen.getByText('Value must be greater than 0.')).toBeInTheDocument();
    expect(screen.getByText('Select at least one category.')).toBeInTheDocument();
  });

  it('calls onSubmit with correct data when form is valid', async () => {
    const onSubmit = jest.fn().mockResolvedValue(undefined);

    render(
      <BudgetForm
        categories={mockCategories}
        onSubmit={onSubmit}
        onCancel={jest.fn()}
      />,
    );

    fireEvent.change(screen.getByLabelText('Name'), { target: { value: 'Transporte' } });
    fireEvent.change(screen.getByLabelText('Value (€)'), { target: { value: '25' } });
    fireEvent.click(screen.getByText('Alquiler'));

    fireEvent.click(screen.getByRole('button', { name: 'Save Budget' }));

    await waitFor(() => {
      expect(onSubmit).toHaveBeenCalledTimes(1);
    });

    expect(onSubmit).toHaveBeenCalledWith({
      name: 'Transporte',
      value: 25,
      categoryIds: ['cat-1'],
    });
  });

  it('calls onCancel when cancel button is clicked', () => {
    const onCancel = jest.fn();

    render(
      <BudgetForm
        categories={mockCategories}
        onSubmit={jest.fn()}
        onCancel={onCancel}
      />,
    );

    fireEvent.click(screen.getByRole('button', { name: 'Cancel' }));

    expect(onCancel).toHaveBeenCalledTimes(1);
  });
});
