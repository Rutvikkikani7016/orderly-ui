import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { toast } from 'react-hot-toast';
import {
  selectPlatforms,
  getPlatformAccounts,
  getFlipkartConnectUrl,
  disconnectPlatformAccount,
} from '../api/platformAccounts.js';
import { PLATFORM } from '../constants/enums.js';

const AVAILABLE_PLATFORMS = [
  {
    key: PLATFORM.FLIPKART,
    name: 'Flipkart',
    icon: (
      <svg className="w-5 h-5 text-blue-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 11V7a4 4 0 00-8 0v4M5 9h14l1 12H4L5 9z" />
      </svg>
    ),
  },
  {
    key: PLATFORM.MEESHO,
    name: 'Meesho',
    icon: (
      <svg className="w-5 h-5 text-pink-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" />
      </svg>
    ),
  },
  {
    key: PLATFORM.AMAZON,
    name: 'Amazon',
    icon: (
      <svg className="w-5 h-5 text-amber-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 3h2l.4 2M7 13h10l4-8H5.4M7 13L5.4 5M7 13l-2.293 2.293c-.63.63-.184 1.707.707 1.707H17m0 0a2 2 0 100 4 2 2 0 000-4zm-8 2a2 2 0 11-4 0 2 2 0 014 0z" />
      </svg>
    ),
  },
  {
    key: PLATFORM.MYNTRA,
    name: 'Myntra',
    icon: (
      <svg className="w-5 h-5 text-rose-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 7h10l2 5H5l2-5zM5 12v7a1 1 0 001 1h12a1 1 0 001-1v-7" />
      </svg>
    ),
  },
];

export default function Onboarding() {
  const navigate = useNavigate();
  const [step, setStep] = useState(1);
  const [selectedPlatforms, setSelectedPlatforms] = useState(['flipkart', 'meesho']);
  const [accounts, setAccounts] = useState([]);
  const [submitting, setSubmitting] = useState(false);
  const [connectingId, setConnectingId] = useState(null);
  const [disconnectingId, setDisconnectingId] = useState(null);

  // Load existing accounts and handle OAuth return query params
  useEffect(() => {
    async function initOnboarding() {
      try {
        // 1. Check for OAuth callback query parameters in URL
        const searchParams = new URLSearchParams(window.location.search);
        const connectStatus = searchParams.get('connect');
        const platform = searchParams.get('platform');
        const reason = searchParams.get('reason');

        if (connectStatus === 'success') {
          toast.success(
            `${platform ? platform.toUpperCase() : 'Flipkart'} seller account connected successfully!`
          );
          // Clean query params without full page reload
          window.history.replaceState({}, document.title, window.location.pathname);
          setStep(2);
        } else if (connectStatus === 'error') {
          toast.error(
            `Could not connect ${platform || 'Flipkart'}${
              reason ? `: ${reason.replace(/_/g, ' ')}` : ''
            }`
          );
          window.history.replaceState({}, document.title, window.location.pathname);
          setStep(2);
        }

        // 2. Fetch platform accounts
        const existing = await getPlatformAccounts();
        if (existing && existing.length > 0) {
          setAccounts(existing);
          setSelectedPlatforms(existing.map((a) => a.platform));
          if (connectStatus === 'success' || connectStatus === 'error') {
            setStep(2);
          }
        }
      } catch (err) {
        // Non-fatal on initial load
      }
    }

    initOnboarding();
  }, []);

  function togglePlatform(key) {
    setSelectedPlatforms((prev) =>
      prev.includes(key) ? prev.filter((k) => k !== key) : [...prev, key]
    );
  }

  async function handleContinue() {
    if (selectedPlatforms.length === 0) return;

    setSubmitting(true);
    try {
      const data = await selectPlatforms(selectedPlatforms);
      setAccounts(data);
      setStep(2);
    } catch (err) {
      const message = err.response?.data?.message || 'Failed to save platform selections.';
      toast.error(message);
    } finally {
      setSubmitting(false);
    }
  }

  // Real OAuth trigger for Flipkart
  async function handleConnectAccount(account) {
    if (account.platform === 'flipkart') {
      setConnectingId(account.id);
      try {
        const data = await getFlipkartConnectUrl(account.id);
        if (data?.authorizeUrl) {
          toast.loading('Redirecting to Flipkart Seller Hub…');
          window.location.href = data.authorizeUrl;
        } else {
          toast.error('Failed to generate Flipkart authorize URL.');
        }
      } catch (err) {
        toast.error(
          err.response?.data?.message || 'Could not initiate Flipkart connection.'
        );
      } finally {
        setConnectingId(null);
      }
    } else {
      const platformMeta = AVAILABLE_PLATFORMS.find((p) => p.key === account.platform) || {
        name: account.platform,
      };
      toast.info(`Coming soon — OAuth setup for ${platformMeta.name}`);
    }
  }

  // Disconnect account
  async function handleDisconnectAccount(accountId) {
    if (!window.confirm('Are you sure you want to disconnect this marketplace account?')) {
      return;
    }

    setDisconnectingId(accountId);
    try {
      await disconnectPlatformAccount(accountId);
      toast.success('Account disconnected');
      const updated = await getPlatformAccounts();
      setAccounts(updated);
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to disconnect account.');
    } finally {
      setDisconnectingId(null);
    }
  }

  function getStatusBadge(status) {
    switch (status) {
      case 'connected':
        return 'bg-emerald-50 text-emerald-700 border-emerald-200';
      case 'needs_reconnect':
      case 'error':
        return 'bg-rose-50 text-rose-700 border-rose-200';
      default:
        return 'bg-amber-50 text-amber-700 border-amber-200';
    }
  }

  return (
    <div className="p-4 md:p-5 font-sans space-y-3.5 max-w-4xl">
      {step === 1 && (
        <div className="space-y-4">
          <div>
            <h1 className="text-xl font-bold text-ink tracking-tight">Which platforms do you sell on?</h1>
            <p className="text-[11px] text-gray-500 mt-0.5">
              Select all platforms you currently operate on. You can connect and manage their integrations anytime.
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {AVAILABLE_PLATFORMS.map((platform) => {
              const isSelected = selectedPlatforms.includes(platform.key);
              return (
                <div
                  key={platform.key}
                  onClick={() => togglePlatform(platform.key)}
                  className={`flex items-center justify-between p-3.5 rounded-xl border transition-all cursor-pointer select-none shadow-xs ${
                    isSelected
                      ? 'border-accent bg-accent/5 ring-1.5 ring-accent/30'
                      : 'border-border bg-white hover:border-gray-300'
                  }`}
                >
                  <div className="flex items-center space-x-3">
                    <div className="w-8 h-8 rounded-lg bg-surface border border-border flex items-center justify-center">
                      {platform.icon}
                    </div>
                    <div>
                      <p className="text-xs font-bold text-ink">{platform.name}</p>
                      <p className="text-[10px] text-gray-400">Sync orders & returns</p>
                    </div>
                  </div>

                  <div
                    className={`w-5 h-5 rounded-full border flex items-center justify-center transition-colors ${
                      isSelected
                        ? 'border-accent bg-accent text-white'
                        : 'border-gray-300 bg-transparent'
                    }`}
                  >
                    {isSelected && (
                      <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                      </svg>
                    )}
                  </div>
                </div>
              );
            })}
          </div>

          <div className="flex items-center justify-end space-x-2.5 pt-2">
            <button
              onClick={() => navigate('/dashboard')}
              className="px-3.5 py-2 text-xs text-gray-600 hover:text-ink font-medium"
            >
              Skip for now
            </button>
            <button
              onClick={handleContinue}
              disabled={selectedPlatforms.length === 0 || submitting}
              className="h-9 px-4 text-xs font-semibold bg-ink text-white hover:bg-black rounded-lg transition-colors disabled:opacity-50 shadow-xs flex items-center"
            >
              {submitting ? 'Saving…' : 'Continue →'}
            </button>
          </div>
        </div>
      )}

      {step === 2 && (
        <div className="space-y-4">
          <div>
            <h1 className="text-xl font-bold text-ink tracking-tight">Connected Sales Channels</h1>
            <p className="text-[11px] text-gray-500 mt-0.5">
              Connect your seller accounts to enable automatic multi-platform order and inventory synchronization.
            </p>
          </div>

          <div className="space-y-2.5">
            {accounts.map((account) => {
              const platformMeta = AVAILABLE_PLATFORMS.find((p) => p.key === account.platform) || {
                name: account.platform,
              };

              const isConnected = account.status === 'connected';
              const needsReconnect = account.status === 'needs_reconnect';
              const isConnecting = connectingId === account.id;
              const isDisconnecting = disconnectingId === account.id;

              return (
                <div
                  key={account.id || account.platform}
                  className="flex flex-col sm:flex-row sm:items-center justify-between p-3.5 rounded-xl border border-border bg-white shadow-xs gap-3"
                >
                  <div className="flex items-center space-x-3">
                    <div className="w-8 h-8 rounded-lg bg-surface border border-border flex items-center justify-center">
                      {platformMeta.icon}
                    </div>
                    <div>
                      <div className="flex items-center space-x-2">
                        <p className="text-xs font-bold text-ink capitalize">{platformMeta.name}</p>
                        <span
                          className={`inline-block text-[9px] font-semibold uppercase px-1.5 py-0.5 rounded border ${getStatusBadge(
                            account.status
                          )}`}
                        >
                          {needsReconnect ? 'Needs Reconnect' : account.status || 'Pending'}
                        </span>
                      </div>
                      <p className="text-[10px] text-gray-400 mt-0.5">
                        {isConnected
                          ? `Seller ID: ${account.platformSellerId || 'Active'} • Auto-syncing`
                          : needsReconnect
                          ? 'Token expired or revoked on Flipkart. Re-connect required.'
                          : 'Not connected yet'}
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center space-x-2 self-end sm:self-auto">
                    {account.platform === 'flipkart' ? (
                      <>
                        <button
                          onClick={() => handleConnectAccount(account)}
                          disabled={isConnecting}
                          className={`h-8 px-3.5 text-xs font-semibold rounded-lg transition-colors shadow-xs flex items-center space-x-1.5 ${
                            isConnected
                              ? 'bg-white hover:bg-gray-50 border border-border text-ink'
                              : needsReconnect
                              ? 'bg-rose-600 hover:bg-rose-700 text-white'
                              : 'bg-blue-600 hover:bg-blue-700 text-white'
                          }`}
                        >
                          {isConnecting ? (
                            <span>Connecting…</span>
                          ) : isConnected ? (
                            <span>Re-authorize</span>
                          ) : needsReconnect ? (
                            <span>Reconnect Flipkart →</span>
                          ) : (
                            <span>Connect Flipkart →</span>
                          )}
                        </button>

                        {isConnected && (
                          <button
                            onClick={() => handleDisconnectAccount(account.id)}
                            disabled={isDisconnecting}
                            className="h-8 px-2.5 text-xs font-semibold bg-red-50 hover:bg-red-100 border border-red-200 text-red-700 rounded-lg transition-colors"
                            title="Disconnect account"
                          >
                            {isDisconnecting ? '…' : 'Disconnect'}
                          </button>
                        )}
                      </>
                    ) : (
                      <button
                        onClick={() => handleConnectAccount(account)}
                        className="h-8 px-3 text-xs font-semibold bg-white hover:bg-gray-50 border border-border text-ink rounded-lg transition-colors shadow-xs"
                      >
                        Manage Settings
                      </button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>

          <div className="flex items-center justify-between pt-2 border-t border-border">
            <button
              onClick={() => setStep(1)}
              className="text-xs text-gray-500 hover:text-ink font-medium"
            >
              ← Back to Selection
            </button>
            <button
              onClick={() => navigate('/dashboard')}
              className="h-9 px-4 text-xs font-semibold bg-ink text-white hover:bg-black rounded-lg transition-colors shadow-xs flex items-center"
            >
              Go to Dashboard →
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
