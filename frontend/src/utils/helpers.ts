export const formatCurrency = (amount: number, currency: string = 'USD'): string => {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency,
  }).format(amount);
};

export const formatDate = (date: string | Date): string => {
  return new Intl.DateTimeFormat('en-US', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  }).format(new Date(date));
};

export const getStatusColor = (status: string): string => {
  const colors: Record<string, string> = {
    draft: '#95a5a6',
    submitted: '#f39c12',
    approved: '#27ae60',
    rejected: '#e74c3c',
    pending: '#f39c12',
  };
  return colors[status] || '#95a5a6';
};