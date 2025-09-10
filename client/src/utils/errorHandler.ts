// Error handling utilities
export interface ApiError {
  message: string;
  code?: string;
  status?: number;
}

export const handleApiError = (error: any): string => {
  console.error('API Error:', error);
  
  if (error.response) {
    // Server responded with error status
    const status = error.response.status;
    const message = error.response.data?.message || error.response.data?.error;
    
    switch (status) {
      case 400:
        return message || 'Ugyldig forespørsel. Sjekk at alle felt er fylt ut korrekt.';
      case 401:
        return 'Du er ikke logget inn. Vennligst logg inn på nytt.';
      case 403:
        return 'Du har ikke tilgang til denne ressursen.';
      case 404:
        return 'Ressursen ble ikke funnet.';
      case 409:
        return message || 'Konflikt: Ressursen eksisterer allerede.';
      case 413:
        return 'Filen er for stor. Maksimal filstørrelse er 50MB.';
      case 415:
        return 'Filtype ikke støttet. Kun OCAD, PDF og bildefiler er tillatt.';
      case 422:
        return message || 'Valideringsfeil. Sjekk at alle felt er fylt ut korrekt.';
      case 429:
        return 'For mange forespørsler. Vennligst vent litt før du prøver igjen.';
      case 500:
        return 'Serverfeil. Vennligst prøv igjen senere.';
      case 502:
        return 'Tjenesten er midlertidig utilgjengelig. Prøv igjen senere.';
      case 503:
        return 'Tjenesten er midlertidig utilgjengelig. Prøv igjen senere.';
      default:
        return message || `Feil (${status}). Vennligst prøv igjen.`;
    }
  } else if (error.request) {
    // Network error
    return 'Nettverksfeil. Sjekk internettforbindelsen din og prøv igjen.';
  } else {
    // Other error
    return error.message || 'En uventet feil oppstod. Vennligst prøv igjen.';
  }
};

export const showErrorToast = (message: string) => {
  // Simple alert for now, can be replaced with a proper toast library
  alert(`❌ ${message}`);
};

export const showSuccessToast = (message: string) => {
  // Simple alert for now, can be replaced with a proper toast library
  alert(`✅ ${message}`);
};

export const showWarningToast = (message: string) => {
  // Simple alert for now, can be replaced with a proper toast library
  alert(`⚠️ ${message}`);
};

// File validation
export const validateFile = (file: File): { isValid: boolean; error?: string } => {
  const maxSize = 50 * 1024 * 1024; // 50MB
  const allowedTypes = [
    'application/pdf',
    'image/jpeg',
    'image/jpg', 
    'image/png',
    'image/gif',
    'application/octet-stream' // For OCAD files
  ];
  
  const allowedExtensions = ['.pdf', '.jpg', '.jpeg', '.png', '.gif', '.ocd'];
  
  if (file.size > maxSize) {
    return {
      isValid: false,
      error: `Filen er for stor. Maksimal størrelse er ${(maxSize / 1024 / 1024).toFixed(0)}MB.`
    };
  }
  
  const fileExtension = '.' + file.name.split('.').pop()?.toLowerCase();
  if (!allowedExtensions.includes(fileExtension)) {
    return {
      isValid: false,
      error: `Filtype ikke støttet. Tillatte formater: ${allowedExtensions.join(', ')}`
    };
  }
  
  return { isValid: true };
};

// Form validation
export const validateMapForm = (data: any): { isValid: boolean; errors: string[] } => {
  const errors: string[] = [];
  
  if (!data.name || data.name.trim().length === 0) {
    errors.push('Kartnavn er påkrevd');
  }
  
  if (data.name && data.name.length > 100) {
    errors.push('Kartnavn kan ikke være lengre enn 100 tegn');
  }
  
  if (data.description && data.description.length > 500) {
    errors.push('Beskrivelse kan ikke være lengre enn 500 tegn');
  }
  
  if (!data.scale || data.scale.trim().length === 0) {
    errors.push('Målestokk er påkrevd');
  }
  
  if (data.contourInterval && (isNaN(data.contourInterval) || data.contourInterval <= 0)) {
    errors.push('Ekvidistanse må være et positivt tall');
  }
  
  return {
    isValid: errors.length === 0,
    errors
  };
};
