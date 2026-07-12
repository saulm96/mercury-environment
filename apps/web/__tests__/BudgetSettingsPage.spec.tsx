import { render, screen, fireEvent, waitFor, within } from '@testing-library/react';
import BudgetSettingsPage from '../src/pages/tools/budgets/BudgetSettingsPage';
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
];

const mockBudgets: Budget[] = [
  {
    id: 'budget-1',
    userId: 'u1',
    name: 'Vivienda',
    value: 500,
    period: 'monthly',
    categories: [mockCategories[0], mockCategories[1]],
    createdAt: new Date('2025-01-01'),
    updatedAt: new Date('2025-01-01'),
  },
  {
    id: 'budget-2',
    userId: 'u1',
    name: 'Transporte',
    value: 200,
    period: 'monthly',
    categories: [mockCategories[2]],
    createdAt: new Date('2025-01-02'),
    updatedAt: new Date('2025-01-02'),
  },
];

const mockUseBudgets = {
  budgets: [] as Budget[],
  stats: null,
  loading: false,
  error: null as string | null,
  fetchBudgets: jest.fn().mockResolvedValue(undefined),
  fetchStats: jest.fn().mockResolvedValue(undefined),
  handleCreate: jest.fn().mockResolvedValue({}),
  handleUpdate: jest.fn().mockResolvedValue(undefined),
  handleDelete: jest.fn().mockResolvedValue(undefined),
};

const mockUseCategories = {
  categories: [] as Category[],
  loading: false,
  error: null as string | null,
  handleCreate: jest.fn().mockResolvedValue({}),
  handleUpdate: jest.fn().mockResolvedValue(undefined),
  handleDelete: jest.fn().mockResolvedValue(undefined),
};

jest.mock('../src/hooks/useBudgets', () => ({
  useBudgets: () => mockUseBudgets,
}));

jest.mock('../src/hooks/useCategories', () => ({
  useCategories: () => mockUseCategories,
}));

function resetMock() {
  mockUseBudgets.budgets = [];
  mockUseBudgets.loading = false;
  mockUseBudgets.error = null;
  mockUseCategories.categories = [];
  mockUseCategories.loading = false;
  mockUseCategories.error = null;
  jest.clearAllMocks();
}

describe('BudgetSettingsPage', () => {
  beforeEach(resetMock);

  it('renders page heading and New Budget button', () => {
    render(<BudgetSettingsPage />);

    expect(screen.getByRole('heading', { name: 'Budget Settings' })).toBeInTheDocument();
    expect(screen.getAllByRole('button', { name: 'New Budget' })).toHaveLength(2);
  });

  it('displays budget cards with name and value', () => {
    mockUseBudgets.budgets = mockBudgets;
    mockUseCategories.categories = mockCategories;

    render(<BudgetSettingsPage />);

    expect(screen.getByText('Vivienda')).toBeInTheDocument();
    expect(screen.getByText('Transporte')).toBeInTheDocument();

    expect(screen.getByText('500.00€')).toBeInTheDocument();
    expect(screen.getByText('200.00€')).toBeInTheDocument();

    expect(screen.queryByText('Percentage')).not.toBeInTheDocument();
    expect(screen.queryByText('Fixed')).not.toBeInTheDocument();
  });

  it('shows category chips for each budget', () => {
    mockUseBudgets.budgets = mockBudgets;
    mockUseCategories.categories = mockCategories;

    render(<BudgetSettingsPage />);

    expect(screen.getByText('Alquiler')).toBeInTheDocument();
    expect(screen.getByText('Comida')).toBeInTheDocument();
    expect(screen.getByText('Netflix')).toBeInTheDocument();
  });

  it('clicking New Budget opens the BudgetForm modal', () => {
    mockUseCategories.categories = mockCategories;

    render(<BudgetSettingsPage />);

    expect(screen.queryByRole('dialog', { name: 'New Budget' })).not.toBeInTheDocument();

    const newBudgetButtons = screen.getAllByRole('button', { name: 'New Budget' });
    fireEvent.click(newBudgetButtons[0]);

    const dialog = screen.getByRole('dialog', { name: 'New Budget' });
    expect(dialog).toBeInTheDocument();
    expect(within(dialog).getByRole('button', { name: 'Save Budget' })).toBeInTheDocument();
  });

  it('clicking Edit opens BudgetForm pre-filled with budget data', () => {
    mockUseBudgets.budgets = mockBudgets;
    mockUseCategories.categories = mockCategories;

    render(<BudgetSettingsPage />);

    fireEvent.click(screen.getByRole('button', { name: /edit vivienda budget/i }));

    const dialog = screen.getByRole('dialog', { name: 'Edit Budget' });
    expect(dialog).toBeInTheDocument();

    const nameInput = within(dialog).getByLabelText('Name') as HTMLInputElement;
    expect(nameInput.value).toBe('Vivienda');

    const valueInput = within(dialog).getByLabelText('Value (€)') as HTMLInputElement;
    expect(valueInput.value).toBe('500');

    expect(within(dialog).getByRole('button', { name: 'Save Changes' })).toBeInTheDocument();
  });

  it('clicking Delete shows confirmation then calls handleDelete', async () => {
    mockUseBudgets.budgets = mockBudgets;
    mockUseCategories.categories = mockCategories;

    render(<BudgetSettingsPage />);

    fireEvent.click(screen.getByRole('button', { name: /delete vivienda budget/i }));

    const dialog = screen.getByRole('dialog', { name: 'Delete budget' });
    expect(dialog).toBeInTheDocument();
    expect(
      within(dialog).getByText(/Delete 'Vivienda' budget\? Categories won't be affected./i),
    ).toBeInTheDocument();

    fireEvent.click(within(dialog).getByRole('button', { name: 'Delete' }));

    await waitFor(() => {
      expect(mockUseBudgets.handleDelete).toHaveBeenCalledTimes(1);
    });
    expect(mockUseBudgets.handleDelete).toHaveBeenCalledWith('budget-1');
  });

  it('shows empty state when no budgets exist', () => {
    mockUseCategories.categories = mockCategories;

    render(<BudgetSettingsPage />);

    expect(
      screen.getByText('No budgets yet. Create your first budget to start tracking spending limits.'),
    ).toBeInTheDocument();
    expect(screen.getAllByRole('button', { name: 'New Budget' })).toHaveLength(2);
  });

  it('shows loading state', () => {
    mockUseBudgets.loading = true;

    render(<BudgetSettingsPage />);

    expect(screen.queryByText('Vivienda')).not.toBeInTheDocument();
    expect(screen.queryByText('Transporte')).not.toBeInTheDocument();
    expect(
      screen.queryByText('No budgets yet. Create your first budget to start tracking spending limits.'),
    ).not.toBeInTheDocument();
  });
});
