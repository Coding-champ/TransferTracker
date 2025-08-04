import React from 'react';
import { render, screen } from '@testing-library/react';
import App from './App';

test('renders Football Transfer Network', () => {
  render(<App />);
  const headerElement = screen.getByText(/Football Transfer Network/i);
  expect(headerElement).toBeInTheDocument();
});
