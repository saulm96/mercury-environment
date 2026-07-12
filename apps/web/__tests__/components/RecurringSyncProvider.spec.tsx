import { render, screen, waitFor } from '@testing-library/react';
import {
  RecurringSyncProvider,
  useRecurringSync,
} from '../../src/components/transactions/RecurringSyncProvider';
import { api } from '../../src/lib/api';

jest.mock('../../src/lib/api');

const mockedApi = api as jest.Mocked<typeof api>;

function TestConsumer() {
  const { ready, error } = useRecurringSync();
  return (
    <div>
      <span data-testid="ready">{ready ? 'ready' : 'not-ready'}</span>
      <span data-testid="error">{error ?? 'no-error'}</span>
    </div>
  );
}

describe('RecurringSyncProvider', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('renders children immediately and becomes ready after processDue succeeds', async () => {
    mockedApi.post.mockResolvedValue({ success: true, data: { generated: 2, errors: [] } });

    render(
      <RecurringSyncProvider>
        <TestConsumer />
        <p>Child content</p>
      </RecurringSyncProvider>,
    );

    expect(screen.getByText('Child content')).toBeInTheDocument();
    expect(screen.getByTestId('ready').textContent).toBe('not-ready');

    await waitFor(() => expect(screen.getByTestId('ready').textContent).toBe('ready'));
    expect(screen.getByTestId('error').textContent).toBe('no-error');
    expect(mockedApi.post).toHaveBeenCalledWith('/recurring-transactions/process-due', {});
  });

  it('sets error state when processDue fails', async () => {
    mockedApi.post.mockRejectedValue(new Error('Sync failed'));

    render(
      <RecurringSyncProvider>
        <TestConsumer />
      </RecurringSyncProvider>,
    );

    await waitFor(() => expect(screen.getByTestId('ready').textContent).toBe('ready'));
    expect(screen.getByTestId('error').textContent).toBe('Sync failed');
  });
});
