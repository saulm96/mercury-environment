import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { CategorySelect } from '../src/components/categories/CategorySelect';
import type { Category } from '@mercury/shared';

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
  {
    id: 'cat-4',
    userId: 'user-1',
    name: 'Others',
    color: '#D1D5DB',
    type: 'expense',
    isFallback: true,
    createdAt: new Date(),
    updatedAt: new Date(),
  },
];

describe('CategorySelect', () => {
  it('renders input with placeholder when no value is selected', () => {
    render(
      <CategorySelect
        categories={mockCategories}
        type="expense"
        value={null}
        onChange={jest.fn()}
        onCreateCategory={jest.fn()}
      />,
    );

    expect(screen.getByPlaceholderText('Search or create category...')).toBeInTheDocument();
  });

  it('shows selected category name when a value is provided', () => {
    render(
      <CategorySelect
        categories={mockCategories}
        type="expense"
        value="cat-1"
        onChange={jest.fn()}
        onCreateCategory={jest.fn()}
      />,
    );

    const input = screen.getByRole('textbox') as HTMLInputElement;
    expect(input.value).toBe('Food');
  });

  it('filters categories by type and search query', async () => {
    render(
      <CategorySelect
        categories={mockCategories}
        type="expense"
        value={null}
        onChange={jest.fn()}
        onCreateCategory={jest.fn()}
      />,
    );

    const input = screen.getByRole('textbox');
    fireEvent.focus(input);
    fireEvent.change(input, { target: { value: 'food' } });

    // Should show Food (expense type) but not Salary (income type)
    await waitFor(() => {
      expect(screen.getByText('Food')).toBeInTheDocument();
    });
    expect(screen.queryByText('Salary')).not.toBeInTheDocument();
    expect(screen.queryByText('Transport')).not.toBeInTheDocument();
  });

  it('shows "Create" option when no exact match exists', async () => {
    render(
      <CategorySelect
        categories={mockCategories}
        type="expense"
        value={null}
        onChange={jest.fn()}
        onCreateCategory={jest.fn()}
      />,
    );

    const input = screen.getByRole('textbox');
    fireEvent.focus(input);
    fireEvent.change(input, { target: { value: 'Groceries' } });

    await waitFor(() => {
      expect(screen.getByText('Create "Groceries"')).toBeInTheDocument();
    });
  });

  it('does not show "Create" option when exact match exists', async () => {
    render(
      <CategorySelect
        categories={mockCategories}
        type="expense"
        value={null}
        onChange={jest.fn()}
        onCreateCategory={jest.fn()}
      />,
    );

    const input = screen.getByRole('textbox');
    fireEvent.focus(input);
    fireEvent.change(input, { target: { value: 'Food' } });

    await waitFor(() => {
      expect(screen.getByText('Food')).toBeInTheDocument();
    });
    expect(screen.queryByText('Create "Food"')).not.toBeInTheDocument();
  });

  it('calls onChange when an existing category is clicked', async () => {
    const onChange = jest.fn();
    render(
      <CategorySelect
        categories={mockCategories}
        type="expense"
        value={null}
        onChange={onChange}
        onCreateCategory={jest.fn()}
      />,
    );

    const input = screen.getByRole('textbox');
    fireEvent.focus(input);

    await waitFor(() => {
      expect(screen.getByText('Food')).toBeInTheDocument();
    });

    fireEvent.click(screen.getByText('Food'));

    expect(onChange).toHaveBeenCalledWith('cat-1');
  });

  it('calls onCreateCategory and then onChange when "Create" is clicked', async () => {
    const onChange = jest.fn();
    const newCategory: Category = {
      id: 'cat-new',
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
      <CategorySelect
        categories={mockCategories}
        type="expense"
        value={null}
        onChange={onChange}
        onCreateCategory={onCreateCategory}
      />,
    );

    const input = screen.getByRole('textbox');
    fireEvent.focus(input);
    fireEvent.change(input, { target: { value: 'Groceries' } });

    await waitFor(() => {
      expect(screen.getByText('Create "Groceries"')).toBeInTheDocument();
    });

    fireEvent.click(screen.getByText('Create "Groceries"'));

    await waitFor(() => {
      expect(onCreateCategory).toHaveBeenCalledWith('Groceries', 'expense', expect.any(String));
    });
    expect(onChange).toHaveBeenCalledWith('cat-new');
  });

  it('displays fallback label for fallback categories', async () => {
    render(
      <CategorySelect
        categories={mockCategories}
        type="expense"
        value={null}
        onChange={jest.fn()}
        onCreateCategory={jest.fn()}
      />,
    );

    const input = screen.getByRole('textbox');
    fireEvent.focus(input);

    await waitFor(() => {
      expect(screen.getByText('default')).toBeInTheDocument();
    });
  });

  it('closes dropdown on Escape', async () => {
    render(
      <CategorySelect
        categories={mockCategories}
        type="expense"
        value={null}
        onChange={jest.fn()}
        onCreateCategory={jest.fn()}
      />,
    );

    const input = screen.getByRole('textbox');
    fireEvent.focus(input);

    await waitFor(() => {
      expect(screen.getByText('Food')).toBeInTheDocument();
    });

    fireEvent.keyDown(input, { key: 'Escape' });

    await waitFor(() => {
      expect(screen.queryByText('Food')).not.toBeInTheDocument();
    });
  });

  it('disables interaction when disabled prop is true', () => {
    render(
      <CategorySelect
        categories={mockCategories}
        type="expense"
        value={null}
        onChange={jest.fn()}
        onCreateCategory={jest.fn()}
        disabled={true}
      />,
    );

    const input = screen.getByRole('textbox') as HTMLInputElement;
    expect(input.disabled).toBe(true);
  });

  it('shows error when category creation fails', async () => {
    const onCreateCategory = jest.fn().mockRejectedValue(new Error('Category already exists'));

    render(
      <CategorySelect
        categories={mockCategories}
        type="expense"
        value={null}
        onChange={jest.fn()}
        onCreateCategory={onCreateCategory}
      />,
    );

    const input = screen.getByRole('textbox');
    fireEvent.focus(input);
    fireEvent.change(input, { target: { value: 'Groceries' } });

    await waitFor(() => {
      expect(screen.getByText('Create "Groceries"')).toBeInTheDocument();
    });

    fireEvent.click(screen.getByText('Create "Groceries"'));

    await waitFor(() => {
      expect(screen.getByText('Category already exists')).toBeInTheDocument();
    });
  });
});
