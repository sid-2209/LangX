import React from 'react';
import toast, { Toaster } from 'react-hot-toast';

// Toast notification types
export const notify = {
  success: (message) => toast.success(message, {
    duration: 3000,
    position: 'top-center',
  }),
  error: (message) => toast.error(message, {
    duration: 5000,
    position: 'top-center',
  }),
  info: (message) => toast(message, {
    duration: 3000,
    position: 'top-center',
    icon: 'ℹ️',
  }),
  warning: (message) => toast(message, {
    duration: 4000,
    position: 'top-center',
    icon: '⚠️',
  }),
  loading: (message) => toast.loading(message, {
    position: 'top-center',
  }),
  update: (toastId, message, type = 'success') => {
    if (type === 'error') {
      toast.error(message, {
        id: toastId,
        duration: 5000,
        position: 'top-center',
      });
    } else {
      toast.success(message, {
        id: toastId,
        duration: 3000,
        position: 'top-center',
      });
    }
  },
};

const Toast = () => {
  return (
    <Toaster
      position="top-center"
      toastOptions={{
        duration: 3000,
        style: {
          background: '#fff',
          color: '#333',
          boxShadow: '0 2px 12px 0 rgba(0,0,0,0.1)',
          borderRadius: '8px',
          padding: '12px 16px',
        },
        success: {
          iconTheme: {
            primary: '#2196f3',
            secondary: '#fff',
          },
        },
        error: {
          iconTheme: {
            primary: '#f50057',
            secondary: '#fff',
          },
        },
      }}
    />
  );
};

export default Toast; 