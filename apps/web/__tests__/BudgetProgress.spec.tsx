import { render, screen } from '@testing-library/react';
import { BudgetProgress } from '../src/components/dashboard/BudgetProgress';
import type { Category } from '@mercury/shared';

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

const defaultProps = {
  name: 'Vivienda',
  value: 500.0,
  allocated: 600.0,
  spent: 520.0,
  remaining: 80.0,
  progress: 87,
  status: 'under' as const,
  categories: mockCategories,
};

describe('BudgetProgress', () => {
  it('renders budget name and allocated amount', () => {
    render(<BudgetProgress {...defaultProps} />);

    expect(screen.getByText('Vivienda')).toBeInTheDocument();
    expect(screen.getByText('600.00€')).toBeInTheDocument();
  });

  it('renders progress bar with correct width', () => {
    render(<BudgetProgress {...defaultProps} />);

    expect(screen.getByText('520.00€ / 600.00€')).toBeInTheDocument();
    expect(screen.getByText('On track (87%)')).toBeInTheDocument();
  });

  it('shows over status in red when progress >= 100', () => {
    render(
      <BudgetProgress
        {...defaultProps}
        progress={133}
        spent={20.0}
        allocated={14.99}
        remaining={-5.01}
        status="over"
        value={14.99}
      />,
    );

    expect(screen.getByText('Over budget (133%)')).toBeInTheDocument();
    expect(screen.getByText('20.00€ / 14.99€')).toBeInTheDocument();
  });

  it('shows category names as badges', () => {
    render(<BudgetProgress {...defaultProps} />);

    expect(screen.getByText('Alquiler')).toBeInTheDocument();
    expect(screen.getByText('Comida')).toBeInTheDocument();
  });

  it('renders value badge', () => {
    render(<BudgetProgress {...defaultProps} />);

    expect(screen.getByText('500.00€')).toBeInTheDocument();
  });
});
