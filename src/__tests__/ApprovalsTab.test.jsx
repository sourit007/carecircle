import React from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import ApprovalsTab from '../pages/tabs/ApprovalsTab';
import { supabase } from '../lib/supabase';

// Mock AuthContext
const mockUseAuth = vi.fn();
vi.mock('../context/AuthContext', () => ({
  useAuth: () => mockUseAuth(),
}));

// Mock ToastContext
vi.mock('../context/ToastContext', () => ({
  useToast: () => ({ showToast: vi.fn() }),
}));

// Mock Supabase
vi.mock('../lib/supabase', () => ({
  supabase: {
    from: vi.fn(),
    rpc: vi.fn(),
  },
}));

describe('ApprovalsTab Component', () => {
  const pendingRequests = [
    {
      id: 42,
      circle_id: 'circle-123',
      requested_by: 'user-caretaker-1',
      action: 'add',
      payload: {
        name: 'Metformin',
        dosage: '500mg',
        notes: 'With evening meal',
        times: ['18:00'],
      },
      status: 'pending',
    },
  ];

  const members = [
    {
      user_id: 'user-caretaker-1',
      display_name: 'Sarah Caretaker',
      role: 'caretaker',
      email: 'sarah@example.com',
    },
  ];

  const medications = [];

  const setupSupabaseMock = () => {
    supabase.from.mockImplementation((table) => {
      if (table === 'change_requests') {
        return {
          select: () => ({
            eq: () => ({
              order: () => Promise.resolve({ data: pendingRequests, error: null }),
            }),
          }),
        };
      }
      if (table === 'members') {
        return {
          select: () => ({
            eq: () => Promise.resolve({ data: members, error: null }),
          }),
        };
      }
      if (table === 'medications') {
        return {
          select: () => ({
            eq: () => Promise.resolve({ data: medications, error: null }),
          }),
        };
      }
      return {
        select: () => ({
          eq: () => Promise.resolve({ data: [], error: null }),
        }),
      };
    });

    supabase.rpc.mockResolvedValue({ data: null, error: null });
  };

  beforeEach(() => {
    vi.clearAllMocks();
    setupSupabaseMock();
  });

  it('shows Approve and Reject buttons when logged in as the Elder', async () => {
    mockUseAuth.mockReturnValue({
      circle: { id: 'circle-123', name: 'Family Circle' },
      isElder: true,
      elderMode: true,
      user: { id: 'user-elder-1' },
    });

    render(<ApprovalsTab onPendingCountChange={vi.fn()} />);

    // Wait for the request card to load
    await waitFor(() => {
      expect(screen.getByText('Metformin')).toBeInTheDocument();
    });

    expect(screen.getByRole('button', { name: /approve change/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /reject request/i })).toBeInTheDocument();
  });

  it('hides Approve and Reject buttons when logged in as a non-elder (caretaker or family)', async () => {
    mockUseAuth.mockReturnValue({
      circle: { id: 'circle-123', name: 'Family Circle' },
      isElder: false,
      elderMode: false,
      user: { id: 'user-caretaker-1' },
    });

    render(<ApprovalsTab onPendingCountChange={vi.fn()} />);

    await waitFor(() => {
      expect(screen.getByText('Metformin')).toBeInTheDocument();
    });

    // Elder action buttons must not exist for non-elder roles
    expect(screen.queryByRole('button', { name: /approve change/i })).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /reject request/i })).not.toBeInTheDocument();

    // Read-only notice for care circle members
    expect(
      screen.getByText(/awaiting review and confirmation by the elder/i)
    ).toBeInTheDocument();
  });

  it('calls supabase.rpc("approve_change", { p_id: 42 }) when elder clicks Approve', async () => {
    const user = userEvent.setup();

    mockUseAuth.mockReturnValue({
      circle: { id: 'circle-123', name: 'Family Circle' },
      isElder: true,
      elderMode: false,
      user: { id: 'user-elder-1' },
    });

    render(<ApprovalsTab onPendingCountChange={vi.fn()} />);

    await waitFor(() => {
      expect(screen.getByRole('button', { name: /approve change/i })).toBeInTheDocument();
    });

    const approveBtn = screen.getByRole('button', { name: /approve change/i });
    await user.click(approveBtn);

    expect(supabase.rpc).toHaveBeenCalledWith('approve_change', {
      p_id: 42,
    });
  });

  it('calls supabase.rpc("reject_change", { p_id: 42 }) when elder clicks Reject', async () => {
    const user = userEvent.setup();

    mockUseAuth.mockReturnValue({
      circle: { id: 'circle-123', name: 'Family Circle' },
      isElder: true,
      elderMode: false,
      user: { id: 'user-elder-1' },
    });

    render(<ApprovalsTab onPendingCountChange={vi.fn()} />);

    await waitFor(() => {
      expect(screen.getByRole('button', { name: /reject request/i })).toBeInTheDocument();
    });

    const rejectBtn = screen.getByRole('button', { name: /reject request/i });
    await user.click(rejectBtn);

    expect(supabase.rpc).toHaveBeenCalledWith('reject_change', {
      p_id: 42,
    });
  });
});
