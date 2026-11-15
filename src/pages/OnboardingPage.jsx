import React, { useState } from 'react';
import { useNavigate, Navigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import ErrorMessage from '../components/ErrorMessage';
import FamilyLogo from '../components/FamilyLogo';
import { 
  Users, 
  PlusCircle, 
  KeyRound, 
  Sparkles, 
  Shield, 
  HeartHandshake, 
  ArrowRight,
  LogOut
} from 'lucide-react';

export default function OnboardingPage() {
  const { circle, createCircle, joinCircle, signOut } = useAuth();
  const navigate = useNavigate();

  // Mode: 'create' or 'join'
  const [activeTab, setActiveTab] = useState('create');

  // Form states
  const [circleName, setCircleName] = useState('');
  const [passcode, setPasscode] = useState('');
  const [displayName, setDisplayName] = useState('');
  const [role, setRole] = useState('elder');

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  // If user already has a circle, go to dashboard
  if (circle) {
    return <Navigate to="/" replace />;
  }

  const handleCreate = async (e) => {
    e.preventDefault();
    setError(null);

    if (!circleName.trim()) {
      setError('Please provide a name for your care circle.');
      return;
    }
    if (!displayName.trim()) {
      setError('Please provide your name.');
      return;
    }

    setLoading(true);
    try {
      await createCircle({
        name: circleName.trim(),
        displayName: displayName.trim(),
        role,
      });
      navigate('/', { replace: true });
    } catch (err) {
      console.error('Error creating circle:', err);
      setError(err);
    } finally {
      setLoading(false);
    }
  };

  const handleJoin = async (e) => {
    e.preventDefault();
    setError(null);

    if (!passcode.trim()) {
      setError('Please enter the care circle passcode.');
      return;
    }
    if (!displayName.trim()) {
      setError('Please provide your name.');
      return;
    }

    setLoading(true);
    try {
      await joinCircle({
        passcode: passcode.trim(),
        displayName: displayName.trim(),
        role,
      });
      navigate('/', { replace: true });
    } catch (err) {
      console.error('Error joining circle:', err);
      setError(err);
    } finally {
      setLoading(false);
    }
  };

  const roleOptions = [
    {
      id: 'elder',
      title: 'Elder',
      subtitle: 'The center of all care decisions',
      desc: 'Can directly manage medications, approve requests, and access our high-contrast Elder Mode.',
      icon: Sparkles,
      color: 'border-amber-400 bg-amber-50/70 text-amber-950',
      iconColor: 'text-amber-600',
    },
    {
      id: 'caretaker',
      title: 'Caretaker',
      subtitle: 'Day-to-day care & support',
      desc: 'Assists with daily dose logs, schedules appointments, and submits medication updates for approval.',
      icon: Shield,
      color: 'border-emerald-400 bg-emerald-50/70 text-emerald-950',
      iconColor: 'text-emerald-700',
    },
    {
      id: 'family',
      title: 'Family',
      subtitle: 'Staying informed & connected',
      desc: 'Monitors adherence, views appointments, and proposes medication updates for peace of mind.',
      icon: HeartHandshake,
      color: 'border-sky-400 bg-sky-50/70 text-sky-950',
      iconColor: 'text-sky-700',
    },
  ];

  return (
    <div className="min-h-screen bg-slate-100 py-10 px-4 sm:px-6 lg:px-8">
      <div className="max-w-3xl mx-auto">
        
        {/* Top Header */}
        <div className="flex justify-between items-center mb-8">
          <div className="flex items-center gap-3">
            <div className="p-3 bg-blue-600 text-white rounded-2xl shadow-md">
              <FamilyLogo className="w-8 h-8 text-white" heartColor="#EF4444" />
            </div>
            <div>
              <h1 className="text-2xl sm:text-3xl font-black text-slate-900">
                Welcome to CircleCare
              </h1>
              <p className="text-sm sm:text-base text-slate-600 font-medium">
                Their health, their choices, your whole family beside them.
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={signOut}
            className="flex items-center gap-2 px-3 sm:px-4 py-2 border-2 border-slate-300 bg-white rounded-xl text-slate-700 font-bold hover:bg-slate-50 transition"
          >
            <LogOut className="w-5 h-5 text-slate-500" />
            <span className="hidden sm:inline">Sign Out</span>
          </button>
        </div>

        {/* Tab Selection: Create vs Join */}
        <div className="grid grid-cols-2 gap-3 p-2 bg-white rounded-3xl border-2 border-slate-200 shadow-md mb-8">
          <button
            type="button"
            onClick={() => {
              setActiveTab('create');
              setError(null);
            }}
            className={`flex items-center justify-center gap-3 py-4 sm:py-5 px-4 rounded-2xl text-lg sm:text-xl font-black transition-all ${
              activeTab === 'create'
                ? 'bg-blue-600 text-white shadow-lg shadow-blue-200'
                : 'text-slate-700 hover:bg-slate-100'
            }`}
          >
            <PlusCircle className="w-6 h-6 sm:w-7 sm:h-7" />
            <span>Create a Care Circle</span>
          </button>

          <button
            type="button"
            onClick={() => {
              setActiveTab('join');
              setError(null);
            }}
            className={`flex items-center justify-center gap-3 py-4 sm:py-5 px-4 rounded-2xl text-lg sm:text-xl font-black transition-all ${
              activeTab === 'join'
                ? 'bg-blue-600 text-white shadow-lg shadow-blue-200'
                : 'text-slate-700 hover:bg-slate-100'
            }`}
          >
            <KeyRound className="w-6 h-6 sm:w-7 sm:h-7" />
            <span>Join with Passcode</span>
          </button>
        </div>

        {/* Error notification */}
        <ErrorMessage error={error} onDismiss={() => setError(null)} />

        {/* Form Container */}
        <div className="bg-white p-6 sm:p-10 rounded-3xl border-2 border-slate-200 shadow-xl">
          
          {activeTab === 'create' ? (
            /* CREATE CIRCLE FORM */
            <form onSubmit={handleCreate} className="space-y-8">
              <div>
                <h2 className="text-2xl font-black text-slate-900">
                  Create a New Care Circle
                </h2>
                <p className="mt-1 text-base sm:text-lg text-slate-600">
                  You'll receive a unique passcode to invite family members and caretakers.
                </p>
              </div>

              {/* Circle Name */}
              <div>
                <label
                  htmlFor="circle-name"
                  className="block text-lg font-bold text-slate-900 mb-2"
                >
                  Care Circle Name
                </label>
                <input
                  id="circle-name"
                  type="text"
                  required
                  value={circleName}
                  onChange={(e) => setCircleName(e.target.value)}
                  placeholder="e.g. Grandma Eleanor's Circle"
                  className="block w-full px-5 py-4 text-lg font-medium rounded-2xl border-2 border-slate-300 text-slate-900 placeholder-slate-400 focus:border-blue-600 focus:ring-4 focus:ring-blue-100 transition"
                />
              </div>

              {/* My Name */}
              <div>
                <label
                  htmlFor="display-name-create"
                  className="block text-lg font-bold text-slate-900 mb-2"
                >
                  My Name (Display Name)
                </label>
                <input
                  id="display-name-create"
                  type="text"
                  required
                  value={displayName}
                  onChange={(e) => setDisplayName(e.target.value)}
                  placeholder="e.g. Eleanor Vance"
                  className="block w-full px-5 py-4 text-lg font-medium rounded-2xl border-2 border-slate-300 text-slate-900 placeholder-slate-400 focus:border-blue-600 focus:ring-4 focus:ring-blue-100 transition"
                />
              </div>

              {/* Role Selection */}
              <div>
                <span className="block text-lg font-bold text-slate-900 mb-3">
                  Select Your Role
                </span>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  {roleOptions.map((opt) => {
                    const Icon = opt.icon;
                    const isSelected = role === opt.id;
                    return (
                      <button
                        key={opt.id}
                        type="button"
                        onClick={() => setRole(opt.id)}
                        className={`text-left p-5 rounded-2xl border-3 transition-all relative ${
                          isSelected
                            ? `border-blue-600 ring-4 ring-blue-100 ${opt.color}`
                            : 'border-slate-200 bg-white hover:border-slate-300'
                        }`}
                      >
                        <div className="flex items-center gap-2 mb-2">
                          <Icon className={`w-6 h-6 ${opt.iconColor}`} />
                          <span className="text-xl font-black text-slate-900">
                            {opt.title}
                          </span>
                        </div>
                        <p className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">
                          {opt.subtitle}
                        </p>
                        <p className="text-sm font-medium text-slate-700">
                          {opt.desc}
                        </p>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Submit Button */}
              <button
                type="submit"
                disabled={loading}
                className="w-full flex items-center justify-center gap-3 py-5 px-6 rounded-2xl text-xl font-black text-white bg-blue-600 hover:bg-blue-700 active:bg-blue-800 disabled:bg-blue-300 shadow-xl shadow-blue-200 transition min-h-[64px]"
              >
                <span>{loading ? 'Creating Care Circle...' : 'Create Care Circle & Continue'}</span>
                {!loading && <ArrowRight className="w-6 h-6" />}
              </button>
            </form>
          ) : (
            /* JOIN CIRCLE FORM */
            <form onSubmit={handleJoin} className="space-y-8">
              <div>
                <h2 className="text-2xl font-black text-slate-900">
                  Join an Existing Care Circle
                </h2>
                <p className="mt-1 text-base sm:text-lg text-slate-600">
                  Enter the passcode provided by the care circle creator or elder.
                </p>
              </div>

              {/* Passcode Field */}
              <div>
                <label
                  htmlFor="passcode"
                  className="block text-base sm:text-lg font-bold text-slate-900 mb-1.5"
                >
                  Enter Care Circle Passcode
                </label>
                <p className="text-xs sm:text-sm text-slate-500 font-medium mb-2.5">
                  Type the passcode provided by the care circle creator or elder.
                </p>
                <div className="relative rounded-2xl shadow-sm">
                  <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none text-slate-400">
                    <KeyRound className="h-6 w-6 text-slate-400" aria-hidden="true" />
                  </div>
                  <input
                    id="passcode"
                    type="text"
                    required
                    value={passcode}
                    onChange={(e) => setPasscode(e.target.value.toUpperCase().trim())}
                    placeholder="e.g. 849201"
                    className="block w-full pl-14 pr-4 py-4 text-lg sm:text-xl font-mono font-bold uppercase rounded-2xl border-2 border-slate-300 text-blue-950 placeholder:font-sans placeholder:normal-case placeholder:font-medium placeholder:text-slate-400 placeholder:tracking-normal focus:border-blue-600 focus:ring-4 focus:ring-blue-100 transition-all tracking-widest"
                  />
                </div>
              </div>

              {/* My Name */}
              <div>
                <label
                  htmlFor="display-name-join"
                  className="block text-lg font-bold text-slate-900 mb-2"
                >
                  My Name (Display Name)
                </label>
                <input
                  id="display-name-join"
                  type="text"
                  required
                  value={displayName}
                  onChange={(e) => setDisplayName(e.target.value)}
                  placeholder="e.g. Mark Vance (Son)"
                  className="block w-full px-5 py-4 text-lg font-medium rounded-2xl border-2 border-slate-300 text-slate-900 placeholder-slate-400 focus:border-blue-600 focus:ring-4 focus:ring-blue-100 transition"
                />
              </div>

              {/* Role Selection */}
              <div>
                <span className="block text-lg font-bold text-slate-900 mb-3">
                  Select Your Role
                </span>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  {roleOptions.map((opt) => {
                    const Icon = opt.icon;
                    const isSelected = role === opt.id;
                    return (
                      <button
                        key={opt.id}
                        type="button"
                        onClick={() => setRole(opt.id)}
                        className={`text-left p-5 rounded-2xl border-3 transition-all relative ${
                          isSelected
                            ? `border-blue-600 ring-4 ring-blue-100 ${opt.color}`
                            : 'border-slate-200 bg-white hover:border-slate-300'
                        }`}
                      >
                        <div className="flex items-center gap-2 mb-2">
                          <Icon className={`w-6 h-6 ${opt.iconColor}`} />
                          <span className="text-xl font-black text-slate-900">
                            {opt.title}
                          </span>
                        </div>
                        <p className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">
                          {opt.subtitle}
                        </p>
                        <p className="text-sm font-medium text-slate-700">
                          {opt.desc}
                        </p>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Submit Button */}
              <button
                type="submit"
                disabled={loading}
                className="w-full flex items-center justify-center gap-3 py-5 px-6 rounded-2xl text-xl font-black text-white bg-blue-600 hover:bg-blue-700 active:bg-blue-800 disabled:bg-blue-300 shadow-xl shadow-blue-200 transition min-h-[64px]"
              >
                <span>{loading ? 'Joining Care Circle...' : 'Join Care Circle & Continue'}</span>
                {!loading && <ArrowRight className="w-6 h-6" />}
              </button>
            </form>
          )}

        </div>

      </div>
    </div>
  );
}

