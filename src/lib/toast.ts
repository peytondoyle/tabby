// Simple toast notification system
export const showToast = (message: string, type: 'success' | 'error' | 'info' = 'info') => {
  // Create toast element
  const toast = document.createElement('div')
  toast.className = `fixed top-4 right-4 z-50 px-4 py-2 rounded-lg text-white text-sm shadow-lg transition-opacity duration-300 ${
    type === 'success' ? 'bg-green-500' :
    type === 'error' ? 'bg-red-500' : 'bg-blue-500'
  }`
  toast.textContent = message

  // Add to DOM
  document.body.appendChild(toast)

  // Remove after 3 seconds
  setTimeout(() => {
    toast.style.opacity = '0'
    setTimeout(() => {
      if (document.body.contains(toast)) {
        document.body.removeChild(toast)
      }
    }, 300)
  }, 3000)
}

export const showSuccess = (message: string) => showToast(message, 'success')
export const showError = (message: string) => showToast(message, 'error')
export const showInfo = (message: string) => showToast(message, 'info')
