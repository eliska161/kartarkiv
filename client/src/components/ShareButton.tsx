import React, { useMemo, useState } from 'react';
import { Share2, Copy, Check, AlertCircle } from 'lucide-react';
import { useToast } from '../contexts/ToastContext';
import { useAuth } from '../contexts/AuthContext';
import apiClient from '../utils/apiClient';

interface ShareButtonProps {
  mapId: number;
  mapName: string;
  className?: string;
}

interface ShareLink {
  id: number;
  token: string;
  url: string;
  expiresAt: string;
  expiresIn: string;
  watermarkEnabled: boolean;
  watermarkText: string;
  createdByName?: string;
  clubName?: string | null;
}

const ShareButton: React.FC<ShareButtonProps> = ({ mapId, mapName, className = '' }) => {
  const [shareLink, setShareLink] = useState<ShareLink | null>(null);
  const [showModal, setShowModal] = useState(false);
  const [copied, setCopied] = useState(false);
  const [disableWatermark, setDisableWatermark] = useState(false);
  const [isGenerating, setIsGenerating] = useState(false);
  const { showSuccess, showError } = useToast();
  const { user } = useAuth();

  const isAdmin = Boolean(user?.isAdmin);

  const defaultCreatorName = useMemo(() => {
    if (!user) {
      return 'Deg';
    }

    const fullName = [user.firstName, user.lastName]
      .filter(Boolean)
      .map(part => part.trim())
      .join(' ')
      .trim();

    if (fullName.length > 0) {
      return fullName;
    }

    return user.username || user.email || 'Deg';
  }, [user]);

  const handleOpenModal = () => {
    if (shareLink) {
      setDisableWatermark(!shareLink.watermarkEnabled);
    } else {
      setDisableWatermark(false);
    }
    setCopied(false);
    setShowModal(true);
  };

  const handleGenerateLink = async () => {
    try {
      setIsGenerating(true);
      const response = await apiClient.post(`/api/maps/${mapId}/share`, {
        watermarkEnabled: !disableWatermark,
      });

      const data = response.data;
      setShareLink(data.shareLink);
      setDisableWatermark(!data.shareLink.watermarkEnabled);
      setCopied(false);
      setShowModal(true);
      showSuccess('Delings-lenke opprettet!');
    } catch (error: any) {
      console.error('Error creating share link:', error);
      showError('Kunne ikke opprette delings-lenke');
    } finally {
      setIsGenerating(false);
    }
  };

  const handleCopyLink = async () => {
    if (!shareLink) return;

    try {
      await navigator.clipboard.writeText(shareLink.url);
      setCopied(true);
      showSuccess('Lenke kopiert til utklippstavle!');

      setTimeout(() => setCopied(false), 2000);
    } catch (error) {
      console.error('Error copying to clipboard:', error);
      showError('Kunne ikke kopiere lenke');
    }
  };

  const formatExpiryDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('no-NO', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const displayCreatorName = shareLink?.createdByName || defaultCreatorName;
  const effectiveClubName = shareLink?.clubName || user?.clubName || 'klubben din';
  const watermarkInfo = shareLink?.watermarkEnabled
    ? 'Denne filen vil automatisk bli vannmerket for sikkerhet.'
    : 'Vannmerking er slått av for denne lenken.';

  return (
    <>
      <button
        onClick={handleOpenModal}
        className={`flex items-center space-x-2 px-3 py-2 text-sm text-gray-600 hover:text-brand-600 hover:bg-brand-50 rounded-lg transition-colors ${className}`}
        title="Del kart"
      >
        <Share2 className="h-4 w-4" />
        <span>Del</span>
      </button>

      {showModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center" style={{ zIndex: 9999 }}>
          <div className="bg-white rounded-lg p-6 max-w-lg w-full mx-4 shadow-xl">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold text-gray-900">Del kart</h3>
              <button
                onClick={() => setShowModal(false)}
                className="text-gray-400 hover:text-gray-600"
                aria-label="Lukk delingsdialog"
              >
                ×
              </button>
            </div>

            <div className="space-y-4">
              <div>
                <p className="text-sm text-gray-600">
                  Deling av: <span className="font-medium text-gray-900">{mapName}</span>
                </p>
                {(shareLink?.clubName || user?.clubName) && (
                  <p className="mt-1 text-xs text-gray-500">
                    Klubb: {shareLink?.clubName || user?.clubName}
                  </p>
                )}
              </div>

              {shareLink ? (
                <>
                  <div className="bg-gray-50 rounded-lg p-3 border border-gray-200">
                    <div className="flex items-center justify-between">
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-mono text-gray-800 truncate">{shareLink.url}</p>
                      </div>
                      <button
                        onClick={handleCopyLink}
                        className="ml-2 p-2 text-gray-500 hover:text-brand-600 transition-colors"
                        title="Kopier lenke"
                      >
                        {copied ? <Check className="h-4 w-4 text-green-600" /> : <Copy className="h-4 w-4" />}
                      </button>
                    </div>
                  </div>

                  <div className="space-y-2">
                    <div className="flex items-start text-sm text-gray-700">
                      <span className="mr-2">🔒</span>
                      <span>{watermarkInfo}</span>
                    </div>
                    <div className="flex items-center text-sm text-gray-600">
                      <span className="mr-2">👤</span>
                      <span>Deling opprettet av: {displayCreatorName}</span>
                    </div>
                    <div className="flex items-center text-sm text-gray-600">
                      <span className="mr-2">📆</span>
                      <span>Gyldig til: {formatExpiryDate(shareLink.expiresAt)}</span>
                    </div>
                    <div className="flex items-center text-sm text-amber-600">
                      <AlertCircle className="h-4 w-4 mr-2" />
                      <span>Denne lenken kan kun brukes én gang</span>
                    </div>
                  </div>

                  {shareLink.watermarkEnabled && (
                    <div className="bg-gray-100 border border-gray-200 rounded-lg p-3 text-sm text-gray-700">
                      <p className="font-semibold text-gray-800 mb-1">Vannmerke som sendes med:</p>
                      <p className="font-mono break-words text-xs text-gray-600">{shareLink.watermarkText}</p>
                      <p className="text-xs text-gray-500 mt-2">Synlig nederst i venstre hjørne for {effectiveClubName}.</p>
                    </div>
                  )}
                </>
              ) : (
                <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
                  <div className="flex items-start space-x-3">
                    <span className="text-lg">🔒</span>
                    <div className="text-sm text-blue-800">
                      <p className="font-medium">Denne filen vil automatisk bli vannmerket for sikkerhet.</p>
                      <p>Vannmerket viser hvem delingen er laget for og hindrer uautorisert videresending.</p>
                    </div>
                  </div>
                </div>
              )}

              {isAdmin && (
                <div className="border border-gray-200 rounded-lg p-3">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-medium text-gray-900">Skru av vannmerking</p>
                      <p className="text-xs text-gray-500">
                        {shareLink ? 'Gjelder for neste lenke du oppretter.' : 'Gjelder for denne lenken.'}
                      </p>
                    </div>
                    <label className="relative inline-flex items-center cursor-pointer">
                      <input
                        type="checkbox"
                        className="sr-only"
                        checked={disableWatermark}
                        onChange={(event) => setDisableWatermark(event.target.checked)}
                      />
                      <span
                        className={`inline-flex h-6 w-11 items-center rounded-full transition ${
                          disableWatermark ? 'bg-brand-600' : 'bg-gray-300'
                        }`}
                      >
                        <span
                          className={`inline-block h-4 w-4 transform rounded-full bg-white transition ${
                            disableWatermark ? 'translate-x-5' : 'translate-x-1'
                          }`}
                        />
                      </span>
                    </label>
                  </div>
                  {!shareLink && disableWatermark && (
                    <p className="mt-2 text-xs text-amber-600 flex items-center">
                      <AlertCircle className="h-3 w-3 mr-1" /> Vannmerking bør kun slås av ved spesielle behov.
                    </p>
                  )}
                </div>
              )}

              {!shareLink && (
                <div className="bg-blue-50 border border-blue-200 rounded-lg p-3 text-sm text-blue-800">
                  Mottakeren kan laste ned alle filer uten å logge inn. Lenken utløper etter 5 timer og kan kun brukes én gang.
                </div>
              )}
            </div>

            <div className="flex justify-end mt-6 space-x-3">
              <button
                onClick={() => setShowModal(false)}
                className="px-4 py-2 text-sm font-medium text-gray-600 bg-gray-100 hover:bg-gray-200 rounded-lg transition-colors"
              >
                Lukk
              </button>
              <button
                onClick={handleGenerateLink}
                disabled={isGenerating}
                className={`px-4 py-2 text-sm font-medium text-white rounded-lg transition-colors ${
                  isGenerating ? 'bg-brand-400 cursor-not-allowed' : 'bg-brand-600 hover:bg-brand-700'
                }`}
              >
                {isGenerating
                  ? 'Oppretter...'
                  : shareLink
                  ? 'Opprett ny delingslenke'
                  : 'Opprett delingslenke'}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
};

export default ShareButton;
