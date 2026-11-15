import React from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import MedicationFormModal from '../components/MedicationFormModal';
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
  },
}));

describe('MedicationFormModal Component', () => {
  const insertMockMedications = vi.fn();
  const insertMockChangeRequests = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();

    insertMockMedications.mockResolvedValue({ data: null, error: null });
    insertMockChangeRequests.mockResolvedValue({ data: null, error: null });

    supabase.from.mockImplementation((table) => {
      if (table === 'medications') {
        return {
          insert: insertMockMedications,
          update: vi.fn().mockReturnValue({ eq: vi.fn().mockResolvedValue({ error: null }) }),
        };
      }
      if (table === 'change_requests') {
        return {
          insert: insertMockChangeRequests,
        };
      }
      return {
        insert: vi.fn().mockResolvedValue({ data: null, error: null }),
      };
    });
  });

  it('submitting as a caretaker creates a change_request and does NOT insert into medications', async () => {
    const user = userEvent.setup();
    const handleClose = vi.fn();
    const handleSuccess = vi.fn();

    mockUseAuth.mockReturnValue({
      circle: { id: 'circle-100' },
      user: { id: 'user-caretaker-99' },
      isElder: false,
      elderName: 'Grandma Mary',
      member: { role: 'caretaker' },
    });

    render(
      <MedicationFormModal
        isOpen={true}
        onClose={handleClose}
        onSuccess={handleSuccess}
        mode="add"
      />
    );

    // Fill in required fields
    const nameInput = screen.getByLabelText(/medication name/i);
    const dosageInput = screen.getByLabelText(/dosage/i);

    await user.type(nameInput, 'Atorvastatin');
    await user.type(dosageInput, '20mg');

    // Submit button for caretaker/family
    const submitBtn = screen.getByRole('button', { name: /send to grandma mary for approval/i });
    await user.click(submitBtn);

    // Verify change_requests insert was called
    await waitFor(() => {
      expect(insertMockChangeRequests).toHaveBeenCalledTimes(1);
    });

    expect(insertMockChangeRequests).toHaveBeenCalledWith(
      expect.objectContaining({
        circle_id: 'circle-100',
        medication_id: null,
        requested_by: 'user-caretaker-99',
        action: 'add',
        payload: expect.objectContaining({
          name: 'Atorvastatin',
          dosage: '20mg',
          times: ['08:00', '20:00'],
        }),
        status: 'pending',
      })
    );

    // Crucially: medications.insert must NOT have been called directly
    expect(insertMockMedications).not.toHaveBeenCalled();

    // Callbacks should trigger
    expect(handleSuccess).toHaveBeenCalled();
    expect(handleClose).toHaveBeenCalled();
  });

  it('submitting as family creates a change_request and does NOT insert into medications', async () => {
    const user = userEvent.setup();

    mockUseAuth.mockReturnValue({
      circle: { id: 'circle-100' },
      user: { id: 'user-family-88' },
      isElder: false,
      elderName: 'Dad',
      member: { role: 'family' },
    });

    render(
      <MedicationFormModal
        isOpen={true}
        onClose={vi.fn()}
        onSuccess={vi.fn()}
        mode="add"
      />
    );

    await user.type(screen.getByLabelText(/medication name/i), 'Vitamin D3');
    await user.type(screen.getByLabelText(/dosage/i), '1000 IU');

    const submitBtn = screen.getByRole('button', { name: /send to dad for approval/i });
    await user.click(submitBtn);

    await waitFor(() => {
      expect(insertMockChangeRequests).toHaveBeenCalledTimes(1);
    });

    expect(insertMockChangeRequests).toHaveBeenCalledWith(
      expect.objectContaining({
        action: 'add',
        requested_by: 'user-family-88',
        payload: expect.objectContaining({
          name: 'Vitamin D3',
          dosage: '1000 IU',
        }),
      })
    );

    expect(insertMockMedications).not.toHaveBeenCalled();
  });

  it('submitting as the elder inserts directly into medications and does NOT create a change_request', async () => {
    const user = userEvent.setup();
    const handleClose = vi.fn();
    const handleSuccess = vi.fn();

    mockUseAuth.mockReturnValue({
      circle: { id: 'circle-100' },
      user: { id: 'user-elder-01' },
      isElder: true,
      elderName: 'Me',
      member: { role: 'elder' },
    });

    render(
      <MedicationFormModal
        isOpen={true}
        onClose={handleClose}
        onSuccess={handleSuccess}
        mode="add"
      />
    );

    await user.type(screen.getByLabelText(/medication name/i), 'Amlodipine');
    await user.type(screen.getByLabelText(/dosage/i), '5mg');

    // Submit button for elder is "Add Medication"
    const submitBtn = screen.getByRole('button', { name: /^add medication$/i });
    await user.click(submitBtn);

    // Verify direct medications insert was called
    await waitFor(() => {
      expect(insertMockMedications).toHaveBeenCalledTimes(1);
    });

    expect(insertMockMedications).toHaveBeenCalledWith(
      expect.objectContaining({
        circle_id: 'circle-100',
        name: 'Amlodipine',
        dosage: '5mg',
        active: true,
      })
    );

    // Crucially: change_requests.insert must NOT have been called
    expect(insertMockChangeRequests).not.toHaveBeenCalled();

    expect(handleSuccess).toHaveBeenCalled();
    expect(handleClose).toHaveBeenCalled();
  });
});
