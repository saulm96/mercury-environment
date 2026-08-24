import { signOut } from '../../src/lib/auth';

const mockFetch = jest.fn().mockResolvedValue({ ok: true });
global.fetch = mockFetch as unknown as typeof fetch;

describe('signOut', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('calls the absolute logout endpoint using VITE_API_URL', async () => {
    await signOut();

    expect(mockFetch).toHaveBeenCalledWith('http://localhost:3001/auth/logout', {
      method: 'POST',
      credentials: 'include',
    });
  });

  it('does not throw when the logout request fails', async () => {
    mockFetch.mockRejectedValueOnce(new Error('Network failure'));

    await expect(signOut()).resolves.toBeUndefined();
    expect(mockFetch).toHaveBeenCalledTimes(1);
  });
});
