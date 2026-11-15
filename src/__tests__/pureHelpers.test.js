import { describe, it, expect } from 'vitest';
import {
  formatTimeInTz,
  formatDateInTz,
  formatDateTimeInTz,
  getCircleDayRange,
} from '../lib/dateUtils';
import { getDoseStatusConfig } from '../lib/formatters';
import {
  buildChangeRequestPayload,
  buildChangeRequestRecord,
} from '../lib/changeRequests';

describe('Pure Helper Functions', () => {
  describe('Time and Date formatting in Circle Timezone', () => {
    const fixedIso = '2026-11-15T14:30:00.000Z';

    it('formats time in UTC accurately', () => {
      const formatted = formatTimeInTz(fixedIso, 'UTC');
      expect(formatted).toMatch(/2:30\s*PM/i);
    });

    it('formats time in America/New_York (UTC-5 in standard time)', () => {
      const formatted = formatTimeInTz(fixedIso, 'America/New_York');
      expect(formatted).toMatch(/9:30\s*AM/i);
    });

    it('formats time in Asia/Kolkata (UTC+5:30)', () => {
      const formatted = formatTimeInTz(fixedIso, 'Asia/Kolkata');
      expect(formatted).toMatch(/8:00\s*PM/i);
    });

    it('handles empty or invalid date gracefully', () => {
      expect(formatTimeInTz('')).toBe('');
      expect(formatTimeInTz(null)).toBe('');
      expect(formatTimeInTz('invalid-date')).toBe('invalid-date');
    });

    it('formats date in circle timezone with weekday and month', () => {
      const formatted = formatDateInTz(fixedIso, 'UTC');
      expect(formatted).toContain('Sunday');
      expect(formatted).toContain('November');
      expect(formatted).toContain('2026');
    });

    it('formats datetime in circle timezone', () => {
      const formatted = formatDateTimeInTz(fixedIso, 'UTC');
      expect(formatted).toContain('Nov');
      expect(formatted).toMatch(/2:30\s*PM/i);
    });

    it('computes circle day range for a given timezone', () => {
      const baseDate = new Date('2026-11-15T12:00:00.000Z');
      const range = getCircleDayRange('America/New_York', baseDate);

      expect(range).toHaveProperty('dateStr', '2026-11-15');
      expect(range).toHaveProperty('startIso');
      expect(range).toHaveProperty('endIso');

      const start = new Date(range.startIso);
      const end = new Date(range.endIso);
      // Span must be roughly 24 hours (86400000 ms - 1 ms)
      expect(end.getTime() - start.getTime()).toBe(24 * 60 * 60 * 1000 - 1);
    });
  });

  describe('Dose Status Label and Colour Mapping', () => {
    it('maps "taken" status to correct badge label and emerald theme', () => {
      const config = getDoseStatusConfig('taken');
      expect(config.label).toBe('Taken');
      expect(config.badgeText).toBe('STATUS: TAKEN');
      expect(config.badgeBg).toContain('bg-emerald-100');
      expect(config.badgeBg).toContain('border-emerald-400');
      expect(config.textColor).toContain('text-emerald-700');
    });

    it('maps "missed" status to correct badge label and rose theme', () => {
      const config = getDoseStatusConfig('missed');
      expect(config.label).toBe('Missed');
      expect(config.badgeText).toBe('STATUS: MISSED');
      expect(config.badgeBg).toContain('bg-rose-100');
      expect(config.badgeBg).toContain('border-rose-400');
      expect(config.textColor).toContain('text-rose-700');
    });

    it('maps "pending" status to correct badge label and amber theme', () => {
      const config = getDoseStatusConfig('pending');
      expect(config.label).toBe('Pending');
      expect(config.badgeText).toBe('STATUS: PENDING');
      expect(config.badgeBg).toContain('bg-amber-100');
      expect(config.badgeBg).toContain('border-amber-400');
      expect(config.textColor).toContain('text-amber-700');
    });

    it('defaults unknown status to pending configuration', () => {
      const config = getDoseStatusConfig('unknown_status');
      expect(config.label).toBe('Pending');
      expect(config.badgeText).toBe('STATUS: PENDING');
    });
  });

  describe('Building Change Requests Payload and Record', () => {
    it('builds payload for "add" action', () => {
      const values = {
        name: 'Metformin ',
        dosage: '500mg',
        notes: 'With breakfast',
        times: ['08:00', '20:00'],
      };
      const payload = buildChangeRequestPayload('add', values);
      expect(payload).toEqual({
        name: 'Metformin',
        dosage: '500mg',
        notes: 'With breakfast',
        times: ['08:00', '20:00'],
      });
    });

    it('builds payload for "update" action', () => {
      const values = {
        name: 'Metformin',
        dosage: '850mg',
        notes: 'Take with food',
        times: ['09:00', '21:00'],
      };
      const payload = buildChangeRequestPayload('update', values);
      expect(payload).toEqual({
        name: 'Metformin',
        dosage: '850mg',
        notes: 'Take with food',
        times: ['09:00', '21:00'],
      });
    });

    it('builds payload for "delete" action with active: false', () => {
      const originalMed = {
        id: 'med-123',
        name: 'Aspirin',
        dosage: '81mg',
        notes: 'Daily cardio',
        times: ['08:00'],
      };
      const payload = buildChangeRequestPayload('delete', {}, originalMed);
      expect(payload).toEqual({
        name: 'Aspirin',
        dosage: '81mg',
        notes: 'Daily cardio',
        times: ['08:00'],
        active: false,
      });
    });

    it('builds complete change_requests record for insertion', () => {
      const record = buildChangeRequestRecord({
        circleId: 'circle-xyz',
        userId: 'user-456',
        action: 'add',
        values: {
          name: 'Lisinopril',
          dosage: '10mg',
          notes: null,
          times: ['08:00'],
        },
      });

      expect(record).toEqual({
        circle_id: 'circle-xyz',
        medication_id: null,
        requested_by: 'user-456',
        action: 'add',
        payload: {
          name: 'Lisinopril',
          dosage: '10mg',
          notes: null,
          times: ['08:00'],
        },
        status: 'pending',
      });
    });

    it('builds update record with associated medication_id', () => {
      const record = buildChangeRequestRecord({
        circleId: 'circle-xyz',
        userId: 'user-456',
        action: 'update',
        medicationId: 'med-789',
        values: {
          name: 'Lisinopril',
          dosage: '20mg',
          notes: 'Increased dose',
          times: ['08:00'],
        },
      });

      expect(record.medication_id).toBe('med-789');
      expect(record.action).toBe('update');
      expect(record.payload.dosage).toBe('20mg');
      expect(record.status).toBe('pending');
    });
  });
});

