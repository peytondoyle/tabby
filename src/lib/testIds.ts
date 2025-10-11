/**
 * Centralized test IDs for consistent testing across the app
 * These IDs are used with data-testid attributes for reliable element selection
 */

export const testIds = {
  // Navigation & Header
  appShell: 'app-shell',
  header: 'header',
  backButton: 'back-button',
  myBillsLink: 'my-bills-link',

  // Flow Steps
  wizardStep: 'wizard-step',
  wizardStepRoot: 'wizard-step-root',
  stepAssignRoot: 'step-assign-root',
  stepShareRoot: 'step-share-root',
  stepPeopleRoot: 'step-people-root',

  // Main Actions
  scanReceiptButton: 'scan-receipt-button',
  addPersonButton: 'add-person-button',
  assignButton: 'assign-button',
  shareButton: 'share-button',
  confirmButton: 'confirm-button',

  // People Management
  peopleList: 'people-list',
  personCard: 'person-card',
  personCardList: 'person-card-list',
  addPersonChip: 'add-person-chip',
  editPersonButton: 'edit-person-button',
  deletePersonButton: 'delete-person-button',
  personAvatar: 'person-avatar',
  personName: 'person-name',
  personHandle: 'person-handle',

  // Item Management
  itemList: 'item-list',
  itemCard: 'item-card',
  itemEmoji: 'item-emoji',
  itemLabel: 'item-label',
  itemPrice: 'item-price',
  itemWeight: 'item-weight',
  itemAssignButton: 'item-assign-button',
  itemUnassignButton: 'item-unassign-button',
  selectedItemsCount: 'selected-items-count',
  clearSelectionButton: 'clear-selection-button',

  // Assignment Actions
  assignSelectedButton: 'assign-selected-button',
  quickAssignButton: 'quick-assign-button',
  undoAssignmentButton: 'undo-assignment-button',

  // Share & Export
  shareCard: 'share-card',
  shareReceiptButton: 'share-receipt-button',
  groupShareButton: 'group-share-button',
  individualShareButton: 'individual-share-button',
  exportButton: 'export-button',

  // Form Elements
  addPersonForm: 'add-person-form',
  personNameInput: 'person-name-input',
  personAvatarInput: 'person-avatar-input',
  personVenmoInput: 'person-venmo-input',
  savePersonButton: 'save-person-button',
  cancelPersonButton: 'cancel-person-button',

  // Navigation Controls
  nextButton: 'next-button',
  prevButton: 'prev-button',
  closeModalButton: 'close-modal-button',
  navigationArrows: 'navigation-arrows',
  leftArrow: 'left-arrow',
  rightArrow: 'right-arrow',

  // Totals & Summary
  totalsContainer: 'totals-container',
  billTotal: 'bill-total',
  personTotal: 'person-total',
  subtotal: 'subtotal',
  taxAmount: 'tax-amount',
  tipAmount: 'tip-amount',

  // Error & Empty States
  errorMessage: 'error-message',
  errorRetryButton: 'error-retry-button',
  emptyState: 'empty-state',
  noItemsMessage: 'no-items-message',
  noPeopleMessage: 'no-people-message',

  // Loading States
  loadingSpinner: 'loading-spinner',
  skeletonLoader: 'skeleton-loader',
  analyzingSpinner: 'analyzing-spinner',

  // Modal & Overlay
  modalContent: 'modal-content',
  assignModeOverlay: 'assign-mode-overlay',

  // Receipt Scanner
  receiptScanner: 'receipt-scanner',
  receiptScannerModal: 'receipt-scanner-modal',
  fileInput: 'file-input',
  cameraButton: 'camera-button',
  analyzeButton: 'analyze-button',
  cancelScanButton: 'cancel-scan-button',

  // Footer
  footer: 'footer',
  footerBranding: 'footer-branding',

  // UI Sandbox & Playground
  uiSandboxHeader: 'ui-sandbox-header',
  uiPlaygroundHeader: 'ui-playground-header',
  buttonsSection: 'buttons-section',
  itemPillsSection: 'item-pills-section',
  cardsSection: 'cards-section',
  modalsSection: 'modals-section',
  avatarsSection: 'avatars-section',
  skeletonSection: 'skeleton-section',
  colorSwatches: 'color-swatches',
  primaryButton: 'primary-button',
  showScrollingModalButton: 'show-scrolling-modal-button',
  showBasicModalButton: 'show-basic-modal-button',
  modalOverlay: 'modal-overlay',
  openModalButton: 'open-modal-button',
} as const

export type TestId = keyof typeof testIds
