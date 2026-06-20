import { render, screen } from '@testing-library/react';
import LandingPage from '../src/pages/LandingPage';

describe('Landing Page', () => {
  it('renders the Sign in with Google button', () => {
    render(<LandingPage />);
    expect(screen.getByText('Sign in with Google')).toBeInTheDocument();
  });
});
