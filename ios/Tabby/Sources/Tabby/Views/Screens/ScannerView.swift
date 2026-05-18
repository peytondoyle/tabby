import SwiftUI
import SwiftData
@preconcurrency import AVFoundation
import PhotosUI

#if canImport(UIKit)
import UIKit

// MARK: - Capture session box

/// `AVCaptureSession` is not `Sendable`; we only pass it through a dedicated serial queue.
/// Boxing avoids `@Sendable` diagnostics on `DispatchQueue.async` without sharing the session across threads.
private final class CaptureSessionBox: @unchecked Sendable {
    nonisolated(unsafe) let session: AVCaptureSession
    init() { self.session = AVCaptureSession() }
}

// MARK: - ScannerViewModel

/// ViewModel for managing camera capture and receipt scanning
@Observable
@MainActor
final class ScannerViewModel: NSObject {

    // MARK: - State

    /// Serial queue for `startRunning` / `stopRunning` so the main thread is not blocked (Thread Performance Checker).
    private let sessionQueue = DispatchQueue(label: "com.tabby.camera.session", qos: .userInitiated)

    private let sessionBox = CaptureSessionBox()

    /// The AVCaptureSession for camera access (preview + configuration on the main actor; start/stop on `sessionQueue`).
    var captureSession: AVCaptureSession { sessionBox.session }

    /// Whether the scanner is currently processing an image
    var isProcessing = false

    /// Status message shown during processing
    var statusMessage = "Processing receipt..."

    /// Error message for display in alert
    var errorMessage: String?

    /// Whether to show the error alert
    var showError = false

    /// The scan result after successful processing
    var scanResult: ScanResult?

    /// Whether scanning completed successfully and ready to navigate
    var scanCompleted = false

    // MARK: - Private Properties

    private var photoOutput: AVCapturePhotoOutput?
    private var photoContinuation: CheckedContinuation<UIImage, Error>?

    // MARK: - Initialization

    override init() {
        super.init()
    }

    // MARK: - Camera Setup

    /// Configure and start the camera capture session
    func setupCamera() async {
        // Check authorization
        let status = AVCaptureDevice.authorizationStatus(for: .video)

        switch status {
        case .authorized:
            await configureSession()
        case .notDetermined:
            let granted = await AVCaptureDevice.requestAccess(for: .video)
            if granted {
                await configureSession()
            } else {
                showError(message: "Camera access is required to scan receipts.")
            }
        case .denied, .restricted:
            showError(message: "Camera access is denied. Please enable it in Settings to scan receipts.")
        @unknown default:
            showError(message: "Unable to access camera.")
        }
    }

    /// Configure the AVCaptureSession with input and output
    private func configureSession() async {
        captureSession.beginConfiguration()
        captureSession.sessionPreset = .photo

        // Add video input
        guard let videoDevice = AVCaptureDevice.default(.builtInWideAngleCamera, for: .video, position: .back) else {
            showError(message: "No camera available on this device.")
            captureSession.commitConfiguration()
            return
        }

        do {
            let videoInput = try AVCaptureDeviceInput(device: videoDevice)

            if captureSession.canAddInput(videoInput) {
                captureSession.addInput(videoInput)
            } else {
                showError(message: "Unable to add camera input.")
                captureSession.commitConfiguration()
                return
            }
        } catch {
            showError(message: "Failed to create camera input: \(error.localizedDescription)")
            captureSession.commitConfiguration()
            return
        }

        // Add photo output (max dimensions replace deprecated isHighResolutionCaptureEnabled on iOS 16+)
        let output = AVCapturePhotoOutput()

        if captureSession.canAddOutput(output) {
            captureSession.addOutput(output)
            photoOutput = output
        } else {
            showError(message: "Unable to add photo output.")
            captureSession.commitConfiguration()
            return
        }

        captureSession.commitConfiguration()

        await startSession()
    }

    /// Start the capture session off the main thread so UI stays responsive.
    private func startSession() async {
        await withCheckedContinuation { (continuation: CheckedContinuation<Void, Never>) in
            let box = sessionBox
            sessionQueue.async {
                let session = box.session
                if !session.isRunning {
                    session.startRunning()
                }
                continuation.resume()
            }
        }
    }

    /// Stop the capture session
    func stopCamera() {
        let box = sessionBox
        sessionQueue.async {
            let session = box.session
            if session.isRunning {
                session.stopRunning()
            }
        }
    }

    // MARK: - Photo Capture

    /// Capture a photo and process it through OCR
    func captureAndProcess() async {
        guard !isProcessing else { return }

        isProcessing = true
        statusMessage = "Capturing image..."

        do {
            // Capture the photo
            let image = try await capturePhoto()

            // Process with OCR
            await processImage(image)

        } catch {
            isProcessing = false
            showError(message: "Failed to capture photo: \(error.localizedDescription)")
        }
    }

    /// Process an image from photo library
    func processSelectedImage(_ image: UIImage) async {
        guard !isProcessing else { return }

        isProcessing = true
        statusMessage = "Processing receipt..."

        await processImage(image)
    }

    /// Common image processing logic
    private func processImage(_ image: UIImage) async {
        statusMessage = "Analyzing receipt..."

        do {
            let result = try await OCRAPI.shared.scanReceipt(image: image)

            // Success
            scanResult = result
            scanCompleted = true
            isProcessing = false

        } catch {
            isProcessing = false
            showError(message: "Failed to scan receipt: \(error.localizedDescription)")
        }
    }

    /// Capture a photo using AVCapturePhotoOutput
    private func capturePhoto() async throws -> UIImage {
        guard let photoOutput = photoOutput else {
            throw ScannerError.notConfigured
        }

        return try await withCheckedThrowingContinuation { continuation in
            self.photoContinuation = continuation

            let settings = AVCapturePhotoSettings()
            settings.maxPhotoDimensions = photoOutput.maxPhotoDimensions

            // Capture on the main actor since we need to access photoOutput
            photoOutput.capturePhoto(with: settings, delegate: self)
        }
    }

    // MARK: - Error Handling

    private func showError(message: String) {
        errorMessage = message
        showError = true
    }

    /// Reset state to allow another scan attempt
    func resetForNewScan() {
        scanResult = nil
        scanCompleted = false
        isProcessing = false
        statusMessage = "Processing receipt..."
    }
}

// MARK: - AVCapturePhotoCaptureDelegate

extension ScannerViewModel: AVCapturePhotoCaptureDelegate {

    nonisolated func photoOutput(
        _ output: AVCapturePhotoOutput,
        didFinishProcessingPhoto photo: AVCapturePhoto,
        error: Error?
    ) {
        Task { @MainActor in
            if let error = error {
                photoContinuation?.resume(throwing: error)
                photoContinuation = nil
                return
            }

            guard let imageData = photo.fileDataRepresentation(),
                  let image = UIImage(data: imageData) else {
                photoContinuation?.resume(throwing: ScannerError.invalidImageData)
                photoContinuation = nil
                return
            }

            photoContinuation?.resume(returning: image)
            photoContinuation = nil
        }
    }
}

// MARK: - Scanner Errors

enum ScannerError: Error, LocalizedError {
    case notConfigured
    case invalidImageData
    case processingFailed(String)

    var errorDescription: String? {
        switch self {
        case .notConfigured:
            return "Camera is not configured"
        case .invalidImageData:
            return "Failed to process captured image"
        case .processingFailed(let reason):
            return "Processing failed: \(reason)"
        }
    }
}

// MARK: - ScannerView

/// Main scanner view for capturing and processing receipt images
struct ScannerView: View {

    @Binding var navigationPath: NavigationPath

    @State private var viewModel = ScannerViewModel()
    @State private var selectedPhotoItem: PhotosPickerItem?
    @State private var showingPhotoPicker = false
    /// Cycles while processing — spec §2 (warm copy, no CSS pulse)
    @State private var processingStatusPhase = 0
    private let processingStatusPhrases = ["Reading receipt…", "Finding items…", "Just a moment…"]

    @Environment(\.dismiss) private var dismiss

    var body: some View {
        ZStack {
            // Camera preview
            CameraPreview(session: viewModel.captureSession)
                .ignoresSafeArea()

            // Overlay UI
            VStack {
                Spacer()

                // Bottom controls — floating glass bar; shutter lifted so it reads as the primary action
                HStack(alignment: .bottom, spacing: 0) {
                    PhotosPicker(selection: $selectedPhotoItem, matching: .images) {
                        VStack(spacing: 6) {
                            Image(systemName: "photo.on.rectangle")
                                .font(.system(size: 22, weight: .semibold))
                            Text("Library")
                                .font(TB.Typography.meta())
                        }
                        .foregroundStyle(TB.Palette.ink)
                        .frame(maxWidth: .infinity)
                        .padding(.vertical, 18)
                    }
                    .disabled(viewModel.isProcessing)

                    captureButton
                        .offset(y: -18)
                        .frame(maxWidth: .infinity)

                    Color.clear
                        .frame(maxWidth: .infinity)
                        .frame(height: 56)
                        .accessibilityHidden(true)
                }
                .padding(.horizontal, TB.Space.lg)
                .padding(.top, 32)
                .padding(.bottom, TB.Space.lg)
                .background {
                    RoundedRectangle(cornerRadius: 36, style: .continuous)
                        .fill(.ultraThinMaterial)
                        .shadow(color: .black.opacity(0.22), radius: 28, y: 14)
                }
                .padding(.horizontal, TB.Space.lg)
                .padding(.bottom, 8)
            }

            // Processing overlay
            if viewModel.isProcessing {
                processingOverlay
            }
        }
        .navigationTitle("Scan receipt")
        .navigationBarTitleDisplayMode(.inline)
        .toolbarBackground(TB.Palette.bg.opacity(0.92), for: .navigationBar)
        .toolbar {
            ToolbarItem(placement: .cancellationAction) {
                Button("Cancel") {
                    dismiss()
                }
                .foregroundStyle(TB.Palette.inkSoft)
            }
        }
        .task {
            await viewModel.setupCamera()
        }
        .onDisappear {
            viewModel.stopCamera()
        }
        .onChange(of: selectedPhotoItem) { _, newValue in
            if let item = newValue {
                Task {
                    await loadAndProcessPhoto(from: item)
                }
            }
        }
        .task(id: viewModel.isProcessing) {
            guard viewModel.isProcessing else { return }
            processingStatusPhase = 0
            while viewModel.isProcessing {
                try? await Task.sleep(nanoseconds: 1_200_000_000)
                await MainActor.run {
                    processingStatusPhase = (processingStatusPhase + 1) % processingStatusPhrases.count
                }
            }
        }
        .alert("Error", isPresented: $viewModel.showError) {
            Button("OK", role: .cancel) { }
        } message: {
            Text(viewModel.errorMessage ?? "An unknown error occurred.")
        }
        .navigationDestination(isPresented: $viewModel.scanCompleted) {
            if let result = viewModel.scanResult {
                ScanResultListView(
                    scanResult: result,
                    navigationPath: $navigationPath
                )
            }
        }
    }

    // MARK: - Photo Loading

    private func loadAndProcessPhoto(from item: PhotosPickerItem) async {
        do {
            if let data = try await item.loadTransferable(type: Data.self),
               let image = UIImage(data: data) {
                await viewModel.processSelectedImage(image)
            }
        } catch {
            viewModel.errorMessage = "Failed to load photo: \(error.localizedDescription)"
            viewModel.showError = true
        }
        // Reset selection
        selectedPhotoItem = nil
    }

    // MARK: - Subviews

    /// Capture button — high contrast on camera preview
    private var captureButton: some View {
        Button {
            Task {
                await viewModel.captureAndProcess()
            }
        } label: {
            ZStack {
                Circle()
                    .strokeBorder(
                        LinearGradient(
                            colors: [
                                TB.Palette.surface1,
                                TB.Palette.surface1.opacity(0.55)
                            ],
                            startPoint: .topLeading,
                            endPoint: .bottomTrailing
                        ),
                        lineWidth: 4
                    )
                    .frame(width: 84, height: 84)
                    .shadow(color: .black.opacity(0.35), radius: 12, y: 6)
                Circle()
                    .fill(TB.Palette.clay)
                    .frame(width: 68, height: 68)
                    .shadow(color: TB.Palette.clay.opacity(0.45), radius: 8, y: 4)
            }
        }
        .buttonStyle(.plain)
        .disabled(viewModel.isProcessing)
    }

    /// Processing overlay — static camera frame, cycling meta (spec §2)
    private var processingOverlay: some View {
        ZStack {
            TB.Palette.scrim
                .ignoresSafeArea()

            VStack(spacing: 18) {
                ZStack {
                    RoundedRectangle(cornerRadius: TB.Radius.lg, style: .continuous)
                        .fill(TB.Palette.surface1)
                        .frame(width: 96, height: 96)
                        .tbShadow(.lg)
                    Image(systemName: "camera.fill")
                        .font(.system(size: 40))
                        .foregroundStyle(TB.Palette.ink)
                }

                Text("Processing…")
                    .font(TB.Typography.scanningTitle())
                    .foregroundStyle(TB.Palette.ink)

                Text(processingStatusPhrases[processingStatusPhase])
                    .font(TB.Typography.metaScanning())
                    .tracking(0.96)
                    .textCase(.uppercase)
                    .foregroundStyle(TB.Palette.inkFaint)

                ProgressView()
                    .tint(TB.Palette.clay)
                    .scaleEffect(1.1)
                    .padding(.top, 8)
            }
            .padding(24)
        }
    }
}

// MARK: - ScanResultListView

/// View for displaying scanned items before creating a bill
struct ScanResultListView: View {

    let scanResult: ScanResult
    @Binding var navigationPath: NavigationPath
    @Environment(BillViewModel.self) private var billViewModel
    @Environment(\.modelContext) private var modelContext
    @State private var isSaving = false

    var body: some View {
        List {
            Section {
                if let place = scanResult.place {
                    LabeledContent("Place", value: place)
                }
                if let date = scanResult.date {
                    LabeledContent("Date", value: date)
                }
            }

            Section("Items") {
                ForEach(scanResult.items) { item in
                    HStack {
                        if let emoji = item.emoji {
                            Text(emoji)
                        }
                        Text(item.label)
                            .font(TB.Typography.body())
                        Spacer()
                        Text(item.price, format: .currency(code: "USD"))
                            .font(TB.Typography.moneyMedium())
                            .monospacedDigit()
                            .foregroundStyle(TB.Palette.mustard)
                    }
                }
            }

            Section("Totals") {
                if let subtotal = scanResult.subtotal {
                    LabeledContent("Subtotal") {
                        Text(subtotal, format: .currency(code: "USD"))
                            .font(TB.Typography.moneyMedium())
                            .monospacedDigit()
                    }
                }
                if let tax = scanResult.tax {
                    LabeledContent("Tax") {
                        Text(tax, format: .currency(code: "USD"))
                            .font(TB.Typography.moneyMedium())
                            .monospacedDigit()
                    }
                }
                if let tip = scanResult.tip {
                    LabeledContent("Tip") {
                        Text(tip, format: .currency(code: "USD"))
                            .font(TB.Typography.moneyMedium())
                            .monospacedDigit()
                    }
                }
                if let total = scanResult.total {
                    LabeledContent("Total") {
                        Text(total, format: .currency(code: "USD"))
                            .font(TB.Typography.moneyLarge())
                            .monospacedDigit()
                            .foregroundStyle(TB.Palette.clay)
                    }
                }
            }
        }
        .scrollContentBackground(.hidden)
        .background(TB.Palette.bg)
        .listRowBackground(TB.Palette.surface1)
        .navigationTitle("Scanned items")
        .navigationBarTitleDisplayMode(.inline)
        .toolbarBackground(TB.Palette.bg, for: .navigationBar)
        .toolbar {
            ToolbarItem(placement: .confirmationAction) {
                Button("Continue") {
                    Task { await continueToBill() }
                }
                .font(TB.Typography.buttonPrimary())
                .foregroundStyle(TB.Palette.clay)
                .disabled(isSaving)
            }
        }
    }

    private func continueToBill() async {
        isSaving = true
        let uid = await MainActor.run { AuthService.shared.currentUserId }
        await billViewModel.createBillFromScan(scanResult, userId: uid)
        isSaving = false
        guard billViewModel.error == nil else { return }
        await MainActor.run {
            billViewModel.syncSplitModesFromPreferences()
            billViewModel.persistSnapshotToSwiftData(context: modelContext)
            navigationPath = NavigationPath()
            navigationPath.append(HomeNavigationDestination.itemList)
        }
    }
}

// MARK: - Previews

#Preview("Scanner View") {
    NavigationStack {
        ScannerView(navigationPath: .constant(NavigationPath()))
    }
    .environment(BillViewModel())
}

#Preview("Scan Result View") {
    NavigationStack {
        ScanResultListView(
            scanResult: ScanResult(
                items: [
                    ScannedItem(label: "Burger", price: 12.99, emoji: "🍔"),
                    ScannedItem(label: "Fries", price: 4.99, emoji: "🍟"),
                    ScannedItem(label: "Soda", price: 2.49, emoji: "🥤")
                ],
                total: 21.92,
                subtotal: 20.47,
                tax: 1.45,
                place: "Joe's Diner",
                date: "2025-01-14"
            ),
            navigationPath: .constant(NavigationPath())
        )
    }
    .environment(BillViewModel())
}

#endif
