import React from 'react';
import { AlertCircle, XCircle } from 'lucide-react';

export default function ErrorMessage({ error, onDismiss }) {
  if (!error) return null;

  // Format Supabase error message cleanly
  let displayMessage = typeof error === 'string' ? error : error?.message || 'An unexpected error occurred.';

  // Friendlier phrasing for common Supabase errors
  if (displayMessage.toLowerCase().includes('invalid login credentials')) {
    displayMessage = 'Incorrect email or password. Please verify and try again.';
  } else if (displayMessage.toLowerCase().includes('user already registered')) {
    displayMessage = 'An account with this email address already exists. Please sign in instead.';
  } else if (displayMessage.toLowerCase().includes('password should be at least')) {
    displayMessage = 'Password must be at least 6 characters long.';
  } else if (displayMessage.toLowerCase().includes('passcode')) {
    displayMessage = `Passcode issue: ${displayMessage}`;
  }

  return (
    <div
      role="alert"
      className="my-4 p-4 md:p-5 rounded-2xl bg-red-50 border-2 border-red-300 text-red-900 shadow-sm flex items-start gap-4 transition-all"
    >
      <AlertCircle className="w-8 h-8 text-red-600 flex-shrink-0 mt-0.5" aria-hidden="true" />
      <div className="flex-1">
        <h3 className="font-bold text-lg md:text-xl text-red-950">Notice</h3>
        <p className="mt-1 text-base md:text-lg font-medium text-red-900 break-words">
          {displayMessage}
        </p>
      </div>
      {onDismiss && (
        <button
          type="button"
          onClick={onDismiss}
          aria-label="Dismiss error notification"
          className="p-2 text-red-700 hover:text-red-900 hover:bg-red-100 rounded-xl transition focus:ring-2 focus:ring-red-600"
        >
          <XCircle className="w-7 h-7" />
        </button>
      )}
    </div>
  );
}

