import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import EconomyLayout from '../src/pages/tools/economy/EconomyLayout';
import { EconomyIndex } from '../src/pages/tools/economy/EconomyLayout';

function renderLayout(initialRoute = '/economy/dashboard') {
  return render(
    <MemoryRouter initialEntries={[initialRoute]}>
      <EconomyLayout />
    </MemoryRouter>,
  );
}

describe('EconomyLayout', () => {
  it('renders the five sub-navigation tabs', () => {
    renderLayout();

    expect(screen.getByRole('link', { name: 'Dashboard' })).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Budgets' })).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Transactions' })).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Recurring' })).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Subscriptions' })).toBeInTheDocument();
  });

  it('marks the active tab with aria-current when on /economy/dashboard', () => {
    renderLayout('/economy/dashboard');

    expect(screen.getByRole('link', { name: 'Dashboard' })).toHaveAttribute('aria-current', 'page');
    expect(screen.getByRole('link', { name: 'Budgets' })).not.toHaveAttribute('aria-current', 'page');
    expect(screen.getByRole('link', { name: 'Transactions' })).not.toHaveAttribute('aria-current', 'page');
  });

  it('marks the Budgets tab as active when on /economy/budgets', () => {
    renderLayout('/economy/budgets');

    expect(screen.getByRole('link', { name: 'Budgets' })).toHaveAttribute('aria-current', 'page');
    expect(screen.getByRole('link', { name: 'Dashboard' })).not.toHaveAttribute('aria-current', 'page');
  });

  it('marks the Transactions tab as active when on /economy/transactions', () => {
    renderLayout('/economy/transactions');

    expect(screen.getByRole('link', { name: 'Transactions' })).toHaveAttribute('aria-current', 'page');
  });

  it('marks the Recurring tab as active when on /economy/recurring', () => {
    renderLayout('/economy/recurring');

    expect(screen.getByRole('link', { name: 'Recurring' })).toHaveAttribute('aria-current', 'page');
  });

  it('marks the Subscriptions tab as active when on /economy/subscriptions', () => {
    renderLayout('/economy/subscriptions');

    expect(screen.getByRole('link', { name: 'Subscriptions' })).toHaveAttribute('aria-current', 'page');
  });

  it('each tab has correct href', () => {
    renderLayout();

    expect(screen.getByRole('link', { name: 'Dashboard' })).toHaveAttribute('href', '/economy/dashboard');
    expect(screen.getByRole('link', { name: 'Budgets' })).toHaveAttribute('href', '/economy/budgets');
    expect(screen.getByRole('link', { name: 'Transactions' })).toHaveAttribute('href', '/economy/transactions');
    expect(screen.getByRole('link', { name: 'Recurring' })).toHaveAttribute('href', '/economy/recurring');
    expect(screen.getByRole('link', { name: 'Subscriptions' })).toHaveAttribute('href', '/economy/subscriptions');
  });

  it('renders a navigation element for the sub-nav', () => {
    renderLayout();

    const nav = screen.getByRole('navigation');
    expect(nav).toBeInTheDocument();
    const links = screen.getAllByRole('link');
    expect(links.length).toBeGreaterThanOrEqual(3);
  });
});

describe('EconomyIndex', () => {
  it('redirects /economy to /economy/dashboard', () => {
    render(
      <MemoryRouter initialEntries={['/economy']}>
        <EconomyIndex />
      </MemoryRouter>,
    );

    expect(screen.queryByText('Dashboard')).not.toBeInTheDocument();
  });
});
