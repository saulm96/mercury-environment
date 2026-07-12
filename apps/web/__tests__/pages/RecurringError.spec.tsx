import { render, screen, fireEvent } from '@testing-library/react';
import RecurringError from '../../src/pages/tools/recurring/RecurringError';

describe('RecurringError', () => {
  it('renders error message and retry button', () => {
    const resetErrorBoundary = jest.fn();
    const error = new Error('Failed to load');

    render(<RecurringError error={error} resetErrorBoundary={resetErrorBoundary} />);

    expect(screen.getByRole('heading', { name: 'Something went wrong' })).toBeInTheDocument();
    expect(screen.getByText('Failed to load')).toBeInTheDocument();

    const retryButton = screen.getByRole('button', { name: 'Try again' });
    expect(retryButton).toBeInTheDocument();

    fireEvent.click(retryButton);
    expect(resetErrorBoundary).toHaveBeenCalledTimes(1);
  });

  it('renders fallback message when error has no message', () => {
    render(<RecurringError error={{}} resetErrorBoundary={jest.fn()} />);

    expect(
      screen.getByText('Failed to load recurring transactions.'),
    ).toBeInTheDocument();
  });
});
