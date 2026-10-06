import { describe, expect, test } from 'vitest';
import { render, screen } from '@testing-library/react';
import GigCard from '../components/GigCard';

const sampleGig = {
  id: 'gig-1',
  title: 'Logo Design',
  description: 'A clean, modern logo for a small business.',
  category: 'design',
  price: 1500,
};

describe('GigCard', () => {
  test('renders the gig title, category, description, and formatted price', () => {
    render(<GigCard gig={sampleGig} />);
    expect(screen.getByText('Logo Design')).toBeInTheDocument();
    expect(screen.getByText('design')).toBeInTheDocument();
    expect(screen.getByText(/clean, modern logo/i)).toBeInTheDocument();
    expect(screen.getByText('R1500.00')).toBeInTheDocument();
  });

  test('renders an optional action element, such as a Book button', () => {
    render(<GigCard gig={sampleGig} action={<button type="button">Book this gig</button>} />);
    expect(screen.getByRole('button', { name: /book this gig/i })).toBeInTheDocument();
  });
});
