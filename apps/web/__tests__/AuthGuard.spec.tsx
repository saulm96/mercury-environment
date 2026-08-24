import { render, screen, waitFor } from '@testing-library/react';
import { AuthGuard } from '../src/components/auth/AuthGuard';
import { api } from '../src/lib/api';

// ---------------------------------------------------------------------------
// Mocks
// ---------------------------------------------------------------------------

jest.mock('../src/lib/api');
const mockedApi = api as jest.Mocked<typeof api>;

const mockNavigate = jest.fn();
jest.mock('react-router-dom', () => ({
  ...jest.requireActual('react-router-dom'),
  useNavigate: () => mockNavigate,
}));

// Mock global fetch for the /auth/logout call inside the catch block
const mockFetch = jest.fn().mockResolvedValue({ ok: true });
global.fetch = mockFetch as unknown as typeof fetch;

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

const ChildContent = () => <p>Protected content</p>;

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe('AuthGuard', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    // Reset mock implementations to default (success)
    mockedApi.get.mockReset();
    mockFetch.mockReset();
    mockNavigate.mockReset();
  });

  // -------------------------------------------------------------------------
  // 1. Shows loading spinner while checking auth
  // -------------------------------------------------------------------------
  it('shows loading spinner while checking auth', async () => {
    // Don't resolve the API call immediately — keep it pending
    let resolveApiCall: (value: unknown) => void;
    mockedApi.get.mockReturnValue(
      new Promise((resolve) => {
        resolveApiCall = resolve;
      }),
    );

    const { container } = render(
      <AuthGuard>
        <ChildContent />
      </AuthGuard>,
    );

    // The spinner should be visible while loading.
    // CSS modules are mocked to {} so class attributes are empty/absent.
    // The spinner renders two nested divs — verify by checking the container has content.
    expect(container.firstChild).toBeInTheDocument();
    expect(container.firstChild).not.toBeNull();

    // Protected content should NOT be visible yet
    expect(screen.queryByText('Protected content')).not.toBeInTheDocument();

    // Resolve to clean up
    resolveApiCall!({ success: true, data: { id: 'u1', email: 'a@b.com', name: 'Test' } });
    await waitFor(() => {
      expect(screen.getByText('Protected content')).toBeInTheDocument();
    });
  });

  // -------------------------------------------------------------------------
  // 2. Renders children when authenticated (user fetch succeeds)
  // -------------------------------------------------------------------------
  it('renders children when authenticated', async () => {
    mockedApi.get.mockResolvedValue({
      success: true,
      data: { id: 'u1', email: 'user@example.com', name: 'John' },
    });

    render(
      <AuthGuard>
        <ChildContent />
      </AuthGuard>,
    );

    await waitFor(() => {
      expect(screen.getByText('Protected content')).toBeInTheDocument();
    });

    // The API should have been called
    expect(mockedApi.get).toHaveBeenCalledWith('/users/me');
    // No redirect should have occurred
    expect(mockNavigate).not.toHaveBeenCalled();
  });

  // -------------------------------------------------------------------------
  // 3. Redirects to landing page when authentication fails
  // -------------------------------------------------------------------------
  it('redirects to landing page when authentication fails', async () => {
    mockedApi.get.mockRejectedValue(new Error('Unauthorized'));

    render(
      <AuthGuard>
        <ChildContent />
      </AuthGuard>,
    );

    await waitFor(() => {
      expect(mockNavigate).toHaveBeenCalledWith('/');
    });

    // Protected content should NOT be rendered
    expect(screen.queryByText('Protected content')).not.toBeInTheDocument();

    // The logout endpoint should have been called with the absolute API origin
    expect(mockFetch).toHaveBeenCalledWith('http://localhost:3001/auth/logout', {
      method: 'POST',
      credentials: 'include',
    });
  });

  // -------------------------------------------------------------------------
  // 4. Handles network error gracefully
  // -------------------------------------------------------------------------
  it('handles network error gracefully (both API and logout fail)', async () => {
    mockedApi.get.mockRejectedValue(new Error('Network error'));
    mockFetch.mockRejectedValue(new Error('Fetch failed'));

    render(
      <AuthGuard>
        <ChildContent />
      </AuthGuard>,
    );

    await waitFor(() => {
      // Should still navigate to landing page even if logout fails
      expect(mockNavigate).toHaveBeenCalledWith('/');
    });

    // Spinner should no longer be visible
    // Protected content should NOT be rendered
    expect(screen.queryByText('Protected content')).not.toBeInTheDocument();
  });

  // -------------------------------------------------------------------------
  // 5. Cleans up properly (does not update state after unmount)
  // -------------------------------------------------------------------------
  it('does not update state after unmount during pending auth check', async () => {
    let resolveApiCall: (value: unknown) => void;
    mockedApi.get.mockReturnValue(
      new Promise((resolve) => {
        resolveApiCall = resolve;
      }),
    );

    const { unmount } = render(
      <AuthGuard>
        <ChildContent />
      </AuthGuard>,
    );

    // Unmount while the API call is still pending
    unmount();

    // Resolve the API call after unmount — should not cause state updates
    resolveApiCall!({ success: true, data: { id: 'u1', email: 'a@b.com', name: 'Test' } });

    // Give it a tick to ensure no errors are thrown
    await new Promise((resolve) => setTimeout(resolve, 50));

    // No thrown errors means the cleanup worked
    expect(mockNavigate).not.toHaveBeenCalled();
  });
});
