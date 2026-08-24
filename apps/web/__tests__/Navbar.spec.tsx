import { render, screen, fireEvent } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { Navbar } from '../src/components/navigation/Navbar';
import type { User } from '@mercury/shared';

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

const mockUseUserReturn = {
  user: null as User | null,
  loading: false,
  error: null as string | null,
  refetch: jest.fn(),
};

jest.mock('../src/hooks/useUser', () => ({
  useUser: () => mockUseUserReturn,
}));

const mockGlobalFetch = jest.fn().mockResolvedValue({ ok: true });
global.fetch = mockGlobalFetch as unknown as typeof fetch;

function renderNavbar() {
  return render(
    <MemoryRouter initialEntries={['/economy/dashboard']}>
      <Navbar />
    </MemoryRouter>,
  );
}

describe('Navbar', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockUseUserReturn.user = null;
    mockUseUserReturn.loading = false;
    mockUseUserReturn.error = null;
    mockGlobalFetch.mockClear();
    delete (window as { location?: unknown }).location;
    (window as { location?: unknown }).location = { href: '' } as Location;
  });

  it('renders brand name "Mercury"', () => {
    renderNavbar();

    const brandLink = screen.getByRole('link', { name: 'Mercury' });
    expect(brandLink).toBeInTheDocument();
    expect(brandLink).toHaveAttribute('href', '/economy/dashboard');
  });

  it('renders "Economy" navigation link', () => {
    renderNavbar();

    const economyLinks = screen.getAllByRole('link', { name: 'Economy' });
    expect(economyLinks.length).toBeGreaterThanOrEqual(1);

    const economyLink = economyLinks.find(
      (link) => link.getAttribute('href') === '/economy/dashboard',
    );
    expect(economyLink).toBeInTheDocument();
  });

  it('renders user avatar with initials', () => {
    mockUseUserReturn.user = mockUser;

    renderNavbar();

    const avatar = screen.getByRole('button', { name: 'User menu' });
    expect(avatar).toBeInTheDocument();
    expect(avatar.textContent).toBe('J');
  });

  it('renders avatar with email initial when name is missing', () => {
    mockUseUserReturn.user = mockUserNoName;

    renderNavbar();

    const avatar = screen.getByRole('button', { name: 'User menu' });
    expect(avatar).toBeInTheDocument();
    expect(avatar.textContent).toBe('J');
  });

  it('clicking the avatar toggles the user menu dropdown', () => {
    mockUseUserReturn.user = mockUser;

    renderNavbar();

    expect(screen.queryByText('Sign Out')).not.toBeInTheDocument();

    const avatar = screen.getByRole('button', { name: 'User menu' });
    fireEvent.click(avatar);

    expect(screen.getByText('John Doe')).toBeInTheDocument();
    expect(screen.getByText('john@example.com')).toBeInTheDocument();

    fireEvent.click(avatar);

    expect(avatar).toHaveAttribute('aria-expanded', 'false');
  });

  it('shows Sign Out button in the dropdown', () => {
    mockUseUserReturn.user = mockUser;

    renderNavbar();

    fireEvent.click(screen.getByRole('button', { name: 'User menu' }));

    const signOutButton = screen.getByRole('button', { name: 'Sign Out' });
    expect(signOutButton).toBeInTheDocument();
  });

  it('calls logout endpoint when Sign Out is clicked', () => {
    mockUseUserReturn.user = mockUser;

    renderNavbar();

    fireEvent.click(screen.getByRole('button', { name: 'User menu' }));
    fireEvent.click(screen.getByRole('button', { name: 'Sign Out' }));

    expect(mockGlobalFetch).toHaveBeenCalledWith('http://localhost:3001/auth/logout', {
      method: 'POST',
      credentials: 'include',
    });
  });

  it('mobile hamburger menu toggles navigation', () => {
    mockUseUserReturn.user = mockUser;

    renderNavbar();

    const hamburger = screen.getByRole('button', { name: 'Toggle menu' });
    expect(hamburger).toBeInTheDocument();
    expect(hamburger.querySelector('svg')).toBeInTheDocument();

    expect(
      document.querySelector('[class*="mobilePanel"]'),
    ).not.toBeInTheDocument();

    fireEvent.click(hamburger);

    const mercuryLinks = screen.getAllByText('Mercury');
    expect(mercuryLinks.length).toBeGreaterThanOrEqual(2);

    fireEvent.click(hamburger);

    const mercuryLinksAfterClose = screen.getAllByText('Mercury');
    expect(mercuryLinksAfterClose).toHaveLength(1);
  });
});
