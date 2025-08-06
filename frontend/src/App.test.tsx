import React from 'react';
import { render, screen } from '@testing-library/react';
import App from './App';

test('renders Football Transfer Network', () => {
  render(<App />);
  const headerElement = screen.getAllByText(/Football Transfer Network/i)[0]; // Get first instance (header)
  expect(headerElement).toBeInTheDocument();
});
