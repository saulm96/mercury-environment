import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { Navbar } from '../src/components/navigation/Navbar';
import type { User } from '@mercury/shared';

// ---------------------------------------------------------------------------
// Mock user
// ---------------------------------------------------------------------------

const mockUser: User = {
  id: 'user-1',
  email: 'john@example.com',
  name: 'John Doe',
  createdAt: new Date('2025-01-01'),
  updatedAt: new Date('2025-01-01'),
};

const mockUserNoName: User = {
  id: 'user-2',
  email: 'jane@example.com',
  name: null as unknown as undefined,
  createdAt: new Date('2025-02-01'),
  updatedAt: new Date('2025-02-01'),
};

// ---------------------------------------------------------------------------
// Shared mock state
// ---------------------------------------------------------------------------

const mockUseUserReturn = {
  user: null as User | null,
  loading: false,
  error: null as string | null,
  refetch: jest.fn(),
};

jest.mock('../src/hooks/useUser', () => ({
  useUser: () => mockUseUserReturn,
}));

// ---------------------------------------------------------------------------
// Mock global.fetch for sign out
// ---------------------------------------------------------------------------

const mockGlobalFetch = jest.fn().mockResolvedValue({ ok: true });
global.fetch = mockGlobalFetch as unknown as typeof fetch;

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function renderNavbar() {
  return render(
    <MemoryRouter initialEntries={['/transactions']}>
      <Navbar />
    </MemoryRouter>,
  );
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe('Navbar', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockUseUserReturn.user = null;
    mockUseUserReturn.loading = false;
    mockUseUserReturn.error = null;
    mockGlobalFetch.mockClear();
    // Mock window.location to prevent navigation errors in tests
    delete (window as { location?: unknown }).location;
    (window as { location?: unknown }).location = { href: '' } as Location;
  });

  // -------------------------------------------------------------------------
  // 1. Renders brand name "Mercury"
  // -------------------------------------------------------------------------
  it('renders brand name "Mercury"', () => {
    renderNavbar();

    // The brand name appears as a link to /transactions
    const brandLink = screen.getByRole('link', { name: 'Mercury' });
    expect(brandLink).toBeInTheDocument();
    expect(brandLink).toHaveAttribute('href', '/transactions');
  });

  // -------------------------------------------------------------------------
  // 2. Renders navigation links (Transactions)
  // -------------------------------------------------------------------------
  it('renders navigation links (Transactions)', () => {
    renderNavbar();

    // There should be a "Transactions" navigation link
    const transactionsLinks = screen.getAllByRole('link', { name: 'Transactions' });
    expect(transactionsLinks.length).toBeGreaterThanOrEqual(1);

    // At least one should point to /transactions
    const transactionsLink = transactionsLinks.find(
      (link) => link.getAttribute('href') === '/transactions',
    );
    expect(transactionsLink).toBeInTheDocument();
  });

  // -------------------------------------------------------------------------
  // 3. Renders user avatar/initials
  // -------------------------------------------------------------------------
  it('renders user avatar with initials', () => {
    mockUseUserReturn.user = mockUser;

    renderNavbar();

    // UserMenu renders the first character of the user's name in uppercase
    const avatar = screen.getByRole('button', { name: 'User menu' });
    expect(avatar).toBeInTheDocument();
    expect(avatar.textContent).toBe('J'); // "John Doe" -> "J"
  });

  it('renders avatar with email initial when name is missing', () => {
    mockUseUserReturn.user = mockUserNoName;

    renderNavbar();

    const avatar = screen.getByRole('button', { name: 'User menu' });
    expect(avatar).toBeInTheDocument();
    expect(avatar.textContent).toBe('J'); // "jane@example.com" -> "J"
  });

  // -------------------------------------------------------------------------
  // 4. Clicking the avatar toggles the user menu dropdown
  // -------------------------------------------------------------------------
  it('clicking the avatar toggles the user menu dropdown', () => {
    mockUseUserReturn.user = mockUser;

    renderNavbar();

    // Dropdown should NOT be visible initially
    expect(screen.queryByText('Sign Out')).not.toBeInTheDocument();

    // Click the avatar to open the dropdown
    const avatar = screen.getByRole('button', { name: 'User menu' });
    fireEvent.click(avatar);

    // Dropdown should now be visible with user info
    expect(screen.getByText('John Doe')).toBeInTheDocument();
    expect(screen.getByText('john@example.com')).toBeInTheDocument();

    // Click the avatar again to close the dropdown
    fireEvent.click(avatar);

    // Dropdown should be closed (Sign Out should not be visible)
    // Note: aria-expanded should reflect closed state
    expect(avatar).toHaveAttribute('aria-expanded', 'false');
  });

  // -------------------------------------------------------------------------
  // 5. Sign out button is visible in the dropdown
  // -------------------------------------------------------------------------
  it('shows Sign Out button in the dropdown', () => {
    mockUseUserReturn.user = mockUser;

    renderNavbar();

    // Open the dropdown
    fireEvent.click(screen.getByRole('button', { name: 'User menu' }));

    // Sign Out button should be visible
    const signOutButton = screen.getByRole('button', { name: 'Sign Out' });
    expect(signOutButton).toBeInTheDocument();
  });

  it('calls logout endpoint when Sign Out is clicked', () => {
    mockUseUserReturn.user = mockUser;

    renderNavbar();

    // Open the dropdown
    fireEvent.click(screen.getByRole('button', { name: 'User menu' }));

    // Click Sign Out
    fireEvent.click(screen.getByRole('button', { name: 'Sign Out' }));

    // fetch should have been called with the logout endpoint
    expect(mockGlobalFetch).toHaveBeenCalledWith('/auth/logout', {
      method: 'POST',
      credentials: 'include',
    });
  });

  // -------------------------------------------------------------------------
  // 6. Mobile hamburger menu toggles navigation
  // -------------------------------------------------------------------------
  it('mobile hamburger menu toggles navigation', () => {
    mockUseUserReturn.user = mockUser;

    renderNavbar();

    const hamburger = screen.getByRole('button', { name: 'Toggle menu' });
    expect(hamburger).toBeInTheDocument();
    // HamburgerIcon SVG should be inside the button
    expect(hamburger.querySelector('svg')).toBeInTheDocument();

    // Mobile panel should NOT be visible initially
    // The mobile backdrop/overlay is not in the DOM when closed
    expect(
      document.querySelector('[class*="mobilePanel"]'),
    ).not.toBeInTheDocument();

    // Click the hamburger button to open the mobile menu
    fireEvent.click(hamburger);

    // Mobile panel should now be visible — it contains "Mercury" as a brand link
    // and the Transactions link. Since there are now additional elements,
    // we check the mobile-specific brand by counting.
    const mercuryLinks = screen.getAllByText('Mercury');
    expect(mercuryLinks.length).toBeGreaterThanOrEqual(2); // desktop brand + mobile brand

    // Click the hamburger again to close
    fireEvent.click(hamburger);

    // Mobile panel should be gone
    // Only one "Mercury" (the desktop brand) should remain visible
    const mercuryLinksAfterClose = screen.getAllByText('Mercury');
    expect(mercuryLinksAfterClose).toHaveLength(1);
  });
});
