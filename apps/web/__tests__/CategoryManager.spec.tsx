import { render, screen, fireEvent, waitFor, within } from '@testing-library/react';
import { CategoryManager } from '../src/components/categories/CategoryManager';
import type { Category } from '@mercury/shared';

// ---------------------------------------------------------------------------
// Mock data
// ---------------------------------------------------------------------------

const mockCategories: Category[] = [
  {
    id: 'cat-1',
    userId: 'u1',
    name: 'Food',
    color: '#FF6B6B',
    type: 'expense',
    isFallback: false,
    createdAt: new Date('2025-01-01'),
    updatedAt: new Date('2025-01-01'),
  },
  {
    id: 'cat-2',
    userId: 'u1',
    name: 'Transport',
    color: '#4ECDC4',
    type: 'expense',
    isFallback: false,
    createdAt: new Date('2025-01-02'),
    updatedAt: new Date('2025-01-02'),
  },
  {
    id: 'cat-3',
    userId: 'u1',
    name: 'Others',
    color: '#D1D5DB',
    type: 'expense',
    isFallback: true,
    createdAt: new Date('2025-01-03'),
    updatedAt: new Date('2025-01-03'),
  },
  {
    id: 'cat-4',
    userId: 'u1',
    name: 'Salary',
    color: '#2ECC71',
    type: 'income',
    isFallback: false,
    createdAt: new Date('2025-01-04'),
    updatedAt: new Date('2025-01-04'),
  },
  {
    id: 'cat-5',
    userId: 'u1',
    name: 'Other Income',
    color: '#95E1D3',
    type: 'income',
    isFallback: true,
    createdAt: new Date('2025-01-05'),
    updatedAt: new Date('2025-01-05'),
  },
];

const defaultProps = {
  categories: mockCategories,
  transactionCounts: {} as Record<string, number>,
  onCreateCategory: jest.fn(),
  onDeleteCategory: jest.fn(),
};

// ---------------------------------------------------------------------------
// describe block
// ---------------------------------------------------------------------------

describe('CategoryManager', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  // -----------------------------------------------------------------------
  // 1. Renders section headings
  // -----------------------------------------------------------------------
  it('renders expense and income section headings', () => {
    render(<CategoryManager {...defaultProps} />);

    expect(
      screen.getByRole('heading', { name: 'Expense Categories' }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole('heading', { name: 'Income Categories' }),
    ).toBeInTheDocument();
  });

  // -----------------------------------------------------------------------
  // 2. Renders category names and colored dots
  // -----------------------------------------------------------------------
  it('renders category names and colored dots with correct background colors', () => {
    render(<CategoryManager {...defaultProps} />);

    // Category names should appear
    expect(screen.getByText('Food')).toBeInTheDocument();
    expect(screen.getByText('Transport')).toBeInTheDocument();
    expect(screen.getByText('Salary')).toBeInTheDocument();

    // Colored dots should have the correct background color via inline style.
    // CSS modules are mocked to {} so we find dots by their inline style property.
    function getDotForCategory(name: string): HTMLElement {
      const li = screen.getByText(name).closest('li');
      if (!li) throw new Error(`Could not find <li> for "${name}"`);
      // The dot is a <span> with a backgroundColor style, not the name span
      const spans = li.querySelectorAll('span');
      const dot = Array.from(spans).find(
        (s) => s.style.backgroundColor !== '' && s.textContent === '',
      ) as HTMLElement;
      if (!dot) throw new Error(`Could not find dot for "${name}"`);
      return dot;
    }

    const foodDot = getDotForCategory('Food');
    expect(foodDot.style.backgroundColor).toBe('rgb(255, 107, 107)'); // #FF6B6B

    const transportDot = getDotForCategory('Transport');
    expect(transportDot.style.backgroundColor).toBe('rgb(78, 205, 196)'); // #4ECDC4
  });

  // -----------------------------------------------------------------------
  // 3. Empty state when no categories exist for a type
  // -----------------------------------------------------------------------
  it('shows empty state when no categories exist for a type', () => {
    render(
      <CategoryManager {...defaultProps} categories={[]} />,
    );

    expect(screen.getByText('No expense categories yet.')).toBeInTheDocument();
    expect(screen.getByText('No income categories yet.')).toBeInTheDocument();
  });

  // -----------------------------------------------------------------------
  // 4. "(default)" badge for fallback categories
  // -----------------------------------------------------------------------
  it('shows "(default)" badge for fallback categories', () => {
    render(<CategoryManager {...defaultProps} />);

    // Both fallback categories should show the badge — one per type
    const badges = screen.getAllByText('(default)');
    expect(badges).toHaveLength(2);
    expect(badges[0]).toBeInTheDocument();
    expect(badges[1]).toBeInTheDocument();
  });

  // -----------------------------------------------------------------------
  // 5. No delete button for fallback categories
  // -----------------------------------------------------------------------
  it('does not show delete button for fallback categories', () => {
    render(<CategoryManager {...defaultProps} />);

    // Fallback expense: "Others"
    expect(
      screen.queryByRole('button', { name: /delete category others/i }),
    ).not.toBeInTheDocument();

    // Fallback income: "Other Income"
    expect(
      screen.queryByRole('button', { name: /delete category other income/i }),
    ).not.toBeInTheDocument();
  });

  // -----------------------------------------------------------------------
  // 6. Clicking delete on a non-fallback category opens ConfirmDeleteModal
  // -----------------------------------------------------------------------
  it('clicking delete on a non-fallback category opens ConfirmDeleteModal', () => {
    render(<CategoryManager {...defaultProps} />);

    // Click the delete button for "Food"
    fireEvent.click(
      screen.getByRole('button', { name: /delete category food/i }),
    );

    // The modal should now be visible
    const dialog = screen.getByRole('dialog');
    expect(dialog).toBeInTheDocument();

    // The modal heading should contain the category name
    expect(
      within(dialog).getByText(/Delete.*Food/i),
    ).toBeInTheDocument();
  });

  // -----------------------------------------------------------------------
  // 7. ConfirmDeleteModal shows affected transaction count
  // -----------------------------------------------------------------------
  it('ConfirmDeleteModal shows affected transaction count when transactions exist', () => {
    const transactionCounts = { 'cat-1': 12 };
    render(
      <CategoryManager
        {...defaultProps}
        transactionCounts={transactionCounts}
      />,
    );

    // Open the modal
    fireEvent.click(
      screen.getByRole('button', { name: /delete category food/i }),
    );

    const dialog = screen.getByRole('dialog');
    // Should show transaction count and the fallback name for expense type
    expect(
      within(dialog).getByText(/12 transactions use this category/i),
    ).toBeInTheDocument();
    expect(
      within(dialog).getByText(/will be moved to "Others"/i),
    ).toBeInTheDocument();
  });

  it('ConfirmDeleteModal shows zero-state message when no transactions are affected', () => {
    const emptyCounts: Record<string, number> = {};
    render(
      <CategoryManager
        {...defaultProps}
        transactionCounts={emptyCounts}
      />,
    );

    // Open modal for Transport category
    fireEvent.click(
      screen.getByRole('button', { name: /delete category transport/i }),
    );

    const dialog = screen.getByRole('dialog');
    expect(
      within(dialog).getByText(/No transactions use this category/i),
    ).toBeInTheDocument();
    expect(
      within(dialog).getByText(/It will be deleted/i),
    ).toBeInTheDocument();
  });

  // -----------------------------------------------------------------------
  // 8. ConfirmDeleteModal cancel button closes the modal
  // -----------------------------------------------------------------------
  it('ConfirmDeleteModal cancel button closes the modal', () => {
    render(<CategoryManager {...defaultProps} />);

    // Open the modal
    fireEvent.click(
      screen.getByRole('button', { name: /delete category salary/i }),
    );
    expect(screen.getByRole('dialog')).toBeInTheDocument();

    // Click the Cancel button inside the modal
    const dialog = screen.getByRole('dialog');
    fireEvent.click(within(dialog).getByRole('button', { name: /^cancel$/i }));

    // Modal should be gone
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
  });

  // -----------------------------------------------------------------------
  // 9. ConfirmDeleteModal confirm button calls onDeleteCategory
  // -----------------------------------------------------------------------
  it('ConfirmDeleteModal confirm button calls onDeleteCategory with the correct id', async () => {
    const onDeleteCategory = jest.fn().mockResolvedValue(undefined);
    render(
      <CategoryManager
        {...defaultProps}
        onDeleteCategory={onDeleteCategory}
      />,
    );

    // Open the modal for "Transport" (id: cat-2)
    fireEvent.click(
      screen.getByRole('button', { name: /delete category transport/i }),
    );

    const dialog = screen.getByRole('dialog');

    // Click the confirm (Delete) button
    fireEvent.click(
      within(dialog).getByRole('button', { name: /^delete$/i }),
    );

    // onDeleteCategory should have been called with the right id
    expect(onDeleteCategory).toHaveBeenCalledTimes(1);
    expect(onDeleteCategory).toHaveBeenCalledWith('cat-2');

    // The modal should close after the async handler resolves
    await waitFor(() => {
      expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    });
  });

  // -----------------------------------------------------------------------
  // 10. Clicking "Add Category" button reveals the add form
  // -----------------------------------------------------------------------
  it('clicking "Add Category" button reveals the inline add form', () => {
    render(<CategoryManager {...defaultProps} />);

    // There are two "Add Category" buttons (expense + income).
    // Click the first one (expense section).
    const addButtons = screen.getAllByRole('button', {
      name: /add category/i,
    });
    fireEvent.click(addButtons[0]);

    // The form input should appear
    expect(
      screen.getByPlaceholderText('Category name...'),
    ).toBeInTheDocument();

    // The Add and Cancel buttons should be present
    expect(screen.getByRole('button', { name: 'Add' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Cancel' })).toBeInTheDocument();

    // The original "Add Category" button for that section should be hidden
    // (the button element is replaced by the form, so only one Add Category remains)
    const remainingAddButtons = screen.getAllByRole('button', {
      name: /add category/i,
    });
    expect(remainingAddButtons).toHaveLength(1);
  });

  // -----------------------------------------------------------------------
  // 11. Add form submit calls onCreateCategory with correct params
  // -----------------------------------------------------------------------
  it('add form submit calls onCreateCategory with correct name and type', async () => {
    const createdCategory: Category = {
      id: 'cat-new',
      userId: 'u1',
      name: 'Groceries',
      color: '#FFE66D',
      type: 'expense',
      isFallback: false,
      createdAt: new Date(),
      updatedAt: new Date(),
    };
    const onCreateCategory = jest.fn().mockResolvedValue(createdCategory);

    render(
      <CategoryManager
        {...defaultProps}
        onCreateCategory={onCreateCategory}
      />,
    );

    // Open the first "Add Category" form (expense section)
    const addButtons = screen.getAllByRole('button', {
      name: /add category/i,
    });
    fireEvent.click(addButtons[0]);

    // Type a category name
    const input = screen.getByPlaceholderText('Category name...');
    fireEvent.change(input, { target: { value: 'Groceries' } });

    // Submit the form
    fireEvent.click(screen.getByRole('button', { name: 'Add' }));

    // onCreateCategory should be called with name, expense type, and a random color
    await waitFor(() => {
      expect(onCreateCategory).toHaveBeenCalledTimes(1);
    });
    expect(onCreateCategory).toHaveBeenCalledWith(
      'Groceries',
      'expense',
      expect.any(String),
    );

    // The form should close after successful creation
    await waitFor(() => {
      expect(
        screen.queryByPlaceholderText('Category name...'),
      ).not.toBeInTheDocument();
    });
  });

  // -----------------------------------------------------------------------
  // 12. Add form Cancel button hides the form
  // -----------------------------------------------------------------------
  it('add form Cancel button hides the form', () => {
    render(<CategoryManager {...defaultProps} />);

    // Open the form
    const addButtons = screen.getAllByRole('button', {
      name: /add category/i,
    });
    fireEvent.click(addButtons[0]);

    // Verify the form is open
    expect(
      screen.getByPlaceholderText('Category name...'),
    ).toBeInTheDocument();

    // Click Cancel
    fireEvent.click(screen.getByRole('button', { name: 'Cancel' }));

    // Form should disappear and Add Category buttons should be back
    expect(
      screen.queryByPlaceholderText('Category name...'),
    ).not.toBeInTheDocument();
    expect(
      screen.getAllByRole('button', { name: /add category/i }),
    ).toHaveLength(2);
  });

  // -----------------------------------------------------------------------
  // 13. Add form submit button is disabled when input is empty
  // -----------------------------------------------------------------------
  it('add form submit button is disabled when input is empty', () => {
    render(<CategoryManager {...defaultProps} />);

    // Open the form
    const addButtons = screen.getAllByRole('button', {
      name: /add category/i,
    });
    fireEvent.click(addButtons[0]);

    const addButton = screen.getByRole('button', { name: 'Add' });
    expect(addButton).toBeDisabled();

    // Type something and make sure it becomes enabled
    const input = screen.getByPlaceholderText('Category name...');
    fireEvent.change(input, { target: { value: 'Test' } });
    expect(addButton).not.toBeDisabled();

    // Clear the input — should be disabled again
    fireEvent.change(input, { target: { value: '' } });
    expect(addButton).toBeDisabled();
  });

  // -----------------------------------------------------------------------
  // 14. Delete button exists for non-fallback categories
  // -----------------------------------------------------------------------
  it('shows delete button for non-fallback categories', () => {
    render(<CategoryManager {...defaultProps} />);

    // Non-fallback expense categories
    expect(
      screen.getByRole('button', { name: /delete category food/i }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole('button', { name: /delete category transport/i }),
    ).toBeInTheDocument();

    // Non-fallback income category
    expect(
      screen.getByRole('button', { name: /delete category salary/i }),
    ).toBeInTheDocument();
  });

  // -----------------------------------------------------------------------
  // 15. Clicking overlay dismisses ConfirmDeleteModal
  // -----------------------------------------------------------------------
  it('ConfirmDeleteModal closes when clicking the overlay backdrop', () => {
    render(<CategoryManager {...defaultProps} />);

    // Open the modal
    fireEvent.click(
      screen.getByRole('button', { name: /delete category food/i }),
    );

    const dialog = screen.getByRole('dialog');
    expect(dialog).toBeInTheDocument();

    // Click the overlay (the dialog element itself has onClick for closing)
    fireEvent.click(dialog);

    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
  });
});
