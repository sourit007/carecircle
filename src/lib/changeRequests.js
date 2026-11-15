/**
 * Utility functions for constructing medication change request payloads and records.
 */

export function buildChangeRequestPayload(action, values = {}, originalMedication = null) {
  if (action === 'delete') {
    const med = originalMedication || values || {};
    return {
      name: med.name || '',
      dosage: med.dosage || '',
      notes: med.notes || null,
      times: Array.isArray(med.times) ? med.times : [],
      active: false,
    };
  }

  // action === 'add' || action === 'update'
  return {
    name: values.name ? String(values.name).trim() : '',
    dosage: values.dosage ? String(values.dosage).trim() : '',
    notes: values.notes && String(values.notes).trim() ? String(values.notes).trim() : null,
    times: Array.isArray(values.times) ? values.times : [],
  };
}

export function buildChangeRequestRecord({
  circleId,
  userId,
  action,
  values = {},
  medicationId = null,
  originalMedication = null,
}) {
  const payload = buildChangeRequestPayload(action, values, originalMedication);
  return {
    circle_id: circleId,
    medication_id: action === 'add' ? null : (medicationId || originalMedication?.id || null),
    requested_by: userId,
    action,
    payload,
    status: 'pending',
  };
}
