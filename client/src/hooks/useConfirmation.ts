import { useState } from 'react';

interface ConfirmationOptions {
  title: string;
  message: string;
  confirmText?: string;
  cancelText?: string;
  type?: 'danger' | 'warning' | 'info' | 'success';
  autoClose?: number;
}

interface ConfirmationState {
  isOpen: boolean;
  options: ConfirmationOptions;
  onConfirm: (() => void) | null;
}

export const useConfirmation = () => {
  const [state, setState] = useState<ConfirmationState>({
    isOpen: false,
    options: {
      title: '',
      message: '',
      confirmText: 'Bekreft',
      cancelText: 'Avbryt',
      type: 'danger'
    },
    onConfirm: null
  });

  const confirm = (options: ConfirmationOptions): Promise<boolean> => {
    return new Promise((resolve) => {
      setState({
        isOpen: true,
        options,
        onConfirm: () => resolve(true)
      });
    });
  };

  const close = () => {
    setState(prev => ({
      ...prev,
      isOpen: false,
      onConfirm: null
    }));
  };

  const handleConfirm = () => {
    if (state.onConfirm) {
      state.onConfirm();
    }
    close();
  };

  return {
    isOpen: state.isOpen,
    options: state.options,
    onClose: close,
    onConfirm: handleConfirm,
    confirm
  };
};
