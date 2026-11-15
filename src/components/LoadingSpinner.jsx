import React from 'react';
import { Loader2 } from 'lucide-react';

export default function LoadingSpinner({ message = 'Loading...' }) {
  return (
    <div className="flex flex-col items-center justify-center min-h-[50vh] p-8 text-center" role="status" aria-live="polite">
      <div className="relative">
        <Loader2 className="w-16 h-16 text-blue-600 animate-spin" aria-hidden="true" />
      </div>
      <p className="mt-6 text-xl md:text-2xl font-semibold text-slate-800 tracking-wide">
        {message}
      </p>
      <span className="sr-only">Please wait, content is loading</span>
    </div>
  );
}

