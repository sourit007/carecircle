import React from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import DoseCard from '../components/DoseCard';
import { supabase } from '../lib/supabase';

// Mock Supabase client
vi.mock('../lib/supabase', () => ({
  supabase: {
    rpc: vi.fn(),
  },
}));

describe('DoseCard Component', () => {
  const baseDose = {
    id: 101,
    medication_id: 1,
    scheduled_at: '2026-11-15T09:00:00.000Z',
    status: 'pending',
    taken_at: null,
    medications: {
      name: 'Blood Pressure Rx',
      dosage: '10mg',
      notes: 'Take with full glass of water',
    },
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('shows "I took it" button for elder role when dose is pending', () => {
    render(
      <DoseCard
        dose={baseDose}
        role="elder"
        timezone="UTC"
      />
    );

    const button = screen.getByRole('button', { name: /i took it/i });
    expect(button).toBeInTheDocument();
  });

  it('shows "I took it" button for caretaker role when dose is missed', () => {
    const missedDose = { ...baseDose, id: 102, status: 'missed' };
    render(
      <DoseCard
        dose={missedDose}
        role="caretaker"
        timezone="UTC"
      />
    );

    const button = screen.getByRole('button', { name: /i took it/i });
    expect(button).toBeInTheDocument();
  });

  it('hides "I took it" button for family role and shows read-only indicator', () => {
    render(
      <DoseCard
        dose={baseDose}
        role="family"
        timezone="UTC"
      />
    );

    expect(screen.queryByRole('button', { name: /i took it/i })).not.toBeInTheDocument();
    expect(screen.getByText(/Family View \(Read Only\)/i)).toBeInTheDocument();
  });

  it('displays correct status badge text label for "pending" status', () => {
    render(<DoseCard dose={baseDose} role="elder" timezone="UTC" />);
    const badge = screen.getByTestId('status-badge');
    expect(badge).toHaveTextContent('STATUS: PENDING');
  });

  it('displays correct status badge text label for "taken" status and hides "I took it" button', () => {
    const takenDose = {
      ...baseDose,
      id: 103,
      status: 'taken',
      taken_at: '2026-11-15T09:05:00.000Z',
    };
    render(<DoseCard dose={takenDose} role="elder" timezone="UTC" />);
    const badge = screen.getByTestId('status-badge');
    expect(badge).toHaveTextContent('STATUS: TAKEN');
    expect(screen.queryByRole('button', { name: /i took it/i })).not.toBeInTheDocument();
    expect(screen.getByText('Completed')).toBeInTheDocument();
  });

  it('displays correct status badge text label for "missed" status', () => {
    const missedDose = { ...baseDose, id: 104, status: 'missed' };
    render(<DoseCard dose={missedDose} role="elder" timezone="UTC" />);
    const badge = screen.getByTestId('status-badge');
    expect(badge).toHaveTextContent('STATUS: MISSED');
  });

  it('clicking "I took it" calls supabase.rpc("mark_dose_taken", { p_dose: id })', async () => {
    supabase.rpc.mockResolvedValueOnce({ data: null, error: null });
    const user = userEvent.setup();
    const handleSuccess = vi.fn();

    render(
      <DoseCard
        dose={baseDose}
        role="elder"
        timezone="UTC"
        onMarkSuccess={handleSuccess}
      />
    );

    const button = screen.getByRole('button', { name: /i took it/i });
    await user.click(button);

    expect(supabase.rpc).toHaveBeenCalledTimes(1);
    expect(supabase.rpc).toHaveBeenCalledWith('mark_dose_taken', {
      p_dose: 101,
    });

    await waitFor(() => {
      expect(handleSuccess).toHaveBeenCalledWith(101);
    });
  });
});

