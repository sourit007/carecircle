import React from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { MemoryRouter } from 'react-router-dom';
import LoginPage from '../pages/LoginPage';

// Mock AuthContext
const mockSignIn = vi.fn();
const mockSignUp = vi.fn();
const mockSignInWithGoogle = vi.fn();

vi.mock('../context/AuthContext', () => ({
  useAuth: () => ({
    signIn: mockSignIn,
    signUp: mockSignUp,
    signInWithGoogle: mockSignInWithGoogle,
  }),
}));

// Mock Supabase client
vi.mock('../lib/supabase', () => ({
  supabase: {
    auth: {
      signInWithOAuth: vi.fn(),
    },
  },
}));

describe('LoginPage Component', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  const renderLoginPage = () => {
    return render(
      <MemoryRouter>
        <LoginPage />
      </MemoryRouter>
    );
  };

  it('renders the "Continue with Google" button', () => {
    renderLoginPage();

    const googleBtn = screen.getByRole('button', {
      name: /continue with google/i,
    });
    expect(googleBtn).toBeInTheDocument();
  });

  it('calls signInWithGoogle when "Continue with Google" is clicked', async () => {
    const user = userEvent.setup();
    mockSignInWithGoogle.mockResolvedValueOnce({});

    renderLoginPage();

    const googleBtn = screen.getByRole('button', {
      name: /continue with google/i,
    });
    await user.click(googleBtn);

    expect(mockSignInWithGoogle).toHaveBeenCalledTimes(1);
  });

  it('shows an error message alert when Supabase returns an error on sign in', async () => {
    const user = userEvent.setup();
    mockSignIn.mockRejectedValueOnce(new Error('Invalid login credentials'));

    renderLoginPage();

    const emailInput = screen.getByLabelText(/enter your email/i);
    const passwordInput = screen.getByLabelText(/enter your password/i);
    const submitBtn = screen.getByRole('button', { name: /sign in with email/i });

    await user.type(emailInput, 'elder@example.com');
    await user.type(passwordInput, 'wrongpassword');
    await user.click(submitBtn);

    // Verify error alert appears with clean error message
    await waitFor(() => {
      const alert = screen.getByRole('alert');
      expect(alert).toBeInTheDocument();
      expect(alert).toHaveTextContent(
        /incorrect email or password|invalid login credentials/i
      );
    });
  });

  it('shows specific error message for other Supabase auth errors', async () => {
    const user = userEvent.setup();
    mockSignIn.mockRejectedValueOnce(new Error('Email link is expired'));

    renderLoginPage();

    const emailInput = screen.getByLabelText(/enter your email/i);
    const passwordInput = screen.getByLabelText(/enter your password/i);
    const submitBtn = screen.getByRole('button', { name: /sign in with email/i });

    await user.type(emailInput, 'user@example.com');
    await user.type(passwordInput, 'securepassword123');
    await user.click(submitBtn);

    await waitFor(() => {
      const alert = screen.getByRole('alert');
      expect(alert).toBeInTheDocument();
      expect(alert).toHaveTextContent(/email link is expired/i);
    });
  });
});
