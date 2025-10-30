import React, { useState } from 'react';
import { Share2, Copy, Check, Clock, AlertCircle } from 'lucide-react';
import { useToast } from '../contexts/ToastContext';
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
}

const ShareButton: React.FC<ShareButtonProps> = ({ mapId, mapName, className = '' }) => {
  const [isLoading, setIsLoading] = useState(false);
  const [shareLink, setShareLink] = useState<ShareLink | null>(null);
  const [showModal, setShowModal] = useState(false);
  const [copied, setCopied] = useState(false);
  const { showSuccess, showError } = useToast();

  const handleShare = async () => {
    try {
      setIsLoading(true);
      
      const response = await apiClient.post(`/api/maps/${mapId}/share`);
      const data = response.data;
      
      setShareLink(data.shareLink);
      setShowModal(true);
      showSuccess('Delings-lenke opprettet!');
      
    } catch (error: any) {
      console.error('Error creating share link:', error);
      showError('Kunne ikke opprette delings-lenke');
    } finally {
      setIsLoading(false);
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

  return (
    <>
      <button
        onClick={handleShare}
        disabled={isLoading}
        className={`flex items-center space-x-2 px-3 py-2 text-sm text-gray-600 hover:text-brand-600 hover:bg-brand-50 rounded-lg transition-colors disabled:opacity-50 ${className}`}
        title="Del kart"
      >
        <Share2 className="h-4 w-4" />
        <span>{isLoading ? 'Oppretter...' : 'Del'}</span>
      </button>

      {/* Share Modal */}
      {showModal && shareLink && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center" style={{ zIndex: 9999 }}>
          <div className="bg-white rounded-lg p-6 max-w-md w-full mx-4">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold text-gray-900">Del kart</h3>
              <button
                onClick={() => setShowModal(false)}
                className="text-gray-400 hover:text-gray-600"
              >
                ×
              </button>
            </div>

            <div className="space-y-4">
              <div>
                <p className="text-sm text-gray-600 mb-2">
                  Deling av: <span className="font-medium">{mapName}</span>
                </p>
              </div>

              <div className="bg-gray-50 rounded-lg p-3">
                <div className="flex items-center justify-between">
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-mono text-gray-800 truncate">
                      {shareLink.url}
                    </p>
                  </div>
                  <button
                    onClick={handleCopyLink}
                    className="ml-2 p-2 text-gray-500 hover:text-brand-600 transition-colors"
                    title="Kopier lenke"
                  >
                    {copied ? (
                      <Check className="h-4 w-4 text-green-600" />
                    ) : (
                      <Copy className="h-4 w-4" />
                    )}
                  </button>
                </div>
              </div>

              <div className="space-y-2">
                <div className="flex items-center text-sm text-gray-600">
                  <Clock className="h-4 w-4 mr-2" />
                  <span>Utløper: {formatExpiryDate(shareLink.expiresAt)} (5 timer)</span>
                </div>
                
                <div className="flex items-center text-sm text-amber-600">
                  <AlertCircle className="h-4 w-4 mr-2" />
                  <span>Denne lenken kan kun brukes én gang</span>
                </div>
              </div>

              <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
                <p className="text-sm text-blue-800">
                  <strong>Tips:</strong> Mottakeren kan laste ned alle filer i kartet uten å logge inn. 
                  Lenken utløper om 5 timer og kan kun brukes én gang.
                </p>
              </div>
            </div>

            <div className="flex justify-end mt-6">
              <button
                onClick={() => setShowModal(false)}
                className="px-4 py-2 bg-brand-600 text-white rounded-lg hover:bg-brand-700 transition-colors"
              >
                Lukk
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
};

export default ShareButton;
