import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { SubscriptionSummaryWidget } from '../../src/components/dashboard/SubscriptionSummary';

function renderWidget(props: {
  monthlyTotal: number;
  activeCount: number;
  nextRenewal: { description: string; daysUntil: number } | null;
}) {
  return render(
    <MemoryRouter>
      <SubscriptionSummaryWidget {...props} />
    </MemoryRouter>,
  );
}

describe('SubscriptionSummaryWidget', () => {
  it('renders monthly total formatted with euro symbol', () => {
    renderWidget({ monthlyTotal: 92.45, activeCount: 4, nextRenewal: null });

    expect(screen.getByText('Subscriptions')).toBeInTheDocument();
    expect(screen.getByText('92.45€')).toBeInTheDocument();
    expect(screen.getByText('4 active')).toBeInTheDocument();
  });

  it('shows next renewal info when provided', () => {
    renderWidget({
      monthlyTotal: 34.99,
      activeCount: 2,
      nextRenewal: { description: 'Netflix', daysUntil: 5 },
    });

    expect(screen.getByText(/Netflix/)).toBeInTheDocument();
    expect(screen.getByText(/in 5 days/)).toBeInTheDocument();
  });

  it('hides next renewal when null', () => {
    renderWidget({ monthlyTotal: 10, activeCount: 1, nextRenewal: null });

    expect(screen.queryByText(/Next:/)).not.toBeInTheDocument();
    expect(screen.queryByText(/days/)).not.toBeInTheDocument();
  });

  it('links to the subscriptions page', () => {
    renderWidget({ monthlyTotal: 10, activeCount: 1, nextRenewal: null });

    const link = screen.getByRole('link');
    expect(link).toHaveAttribute('href', '/economy/subscriptions');
  });
});
