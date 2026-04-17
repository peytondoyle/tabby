import SwiftUI
import AVFoundation
import PhotosUI

#if canImport(UIKit)
import UIKit

// MARK: - ScannerViewModel

/// ViewModel for managing camera capture and receipt scanning
@Observable
@MainActor
final class ScannerViewModel: NSObject {

    // MARK: - State

    /// The AVCaptureSession for camera access
    let captureSession = AVCaptureSession()

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

        // Add photo output
        let output = AVCapturePhotoOutput()
        output.isHighResolutionCaptureEnabled = true

        if captureSession.canAddOutput(output) {
            captureSession.addOutput(output)
            photoOutput = output
        } else {
            showError(message: "Unable to add photo output.")
            captureSession.commitConfiguration()
            return
        }

        captureSession.commitConfiguration()

        // Start the session on a background thread
        await startSession()
    }

    /// Start the capture session
    private func startSession() async {
        await withCheckedContinuation { continuation in
            DispatchQueue.global(qos: .userInitiated).async { [weak self] in
                self?.captureSession.startRunning()
                continuation.resume()
            }
        }
    }

    /// Stop the capture session
    func stopCamera() {
        DispatchQueue.global(qos: .userInitiated).async { [weak self] in
            self?.captureSession.stopRunning()
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
            settings.isHighResolutionPhotoEnabled = true

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

    @State private var viewModel = ScannerViewModel()
    @State private var selectedPhotoItem: PhotosPickerItem?
    @State private var showingPhotoPicker = false
    @Environment(\.dismiss) private var dismiss

    var body: some View {
        ZStack {
            // Camera preview
            CameraPreview(session: viewModel.captureSession)
                .ignoresSafeArea()

            // Overlay UI
            VStack {
                Spacer()

                // Bottom controls
                HStack(spacing: 40) {
                    // Photo library button
                    PhotosPicker(selection: $selectedPhotoItem, matching: .images) {
                        VStack(spacing: 4) {
                            Image(systemName: "photo.on.rectangle")
                                .font(.system(size: 24))
                            Text("Library")
                                .font(.caption2)
                        }
                        .foregroundStyle(.white)
                        .frame(width: 60)
                    }
                    .disabled(viewModel.isProcessing)

                    // Capture button
                    captureButton

                    // Spacer to balance layout
                    Color.clear
                        .frame(width: 60)
                }
                .padding(.bottom, 40)
            }

            // Processing overlay
            if viewModel.isProcessing {
                processingOverlay
            }
        }
        .navigationTitle("Scan Receipt")
        .navigationBarTitleDisplayMode(.inline)
        .toolbar {
            ToolbarItem(placement: .cancellationAction) {
                Button("Cancel") {
                    dismiss()
                }
            }
        }
        .task {
            await viewModel.setupCamera()
        }
        .onDisappear {
            viewModel.stopCamera()
        }
        .onChange(of: selectedPhotoItem) { oldValue, newValue in
            if let item = newValue {
                Task {
                    await loadAndProcessPhoto(from: item)
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
                ScanResultListView(scanResult: result)
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

    /// Large white capture button
    private var captureButton: some View {
        Button {
            Task {
                await viewModel.captureAndProcess()
            }
        } label: {
            ZStack {
                // Outer ring
                Circle()
                    .stroke(Color.white, lineWidth: 4)
                    .frame(width: 80, height: 80)

                // Inner filled circle
                Circle()
                    .fill(Color.white)
                    .frame(width: 64, height: 64)
            }
        }
        .disabled(viewModel.isProcessing)
    }

    /// Processing overlay with status message
    private var processingOverlay: some View {
        ZStack {
            Color.black.opacity(0.7)
                .ignoresSafeArea()

            VStack(spacing: 20) {
                ProgressView()
                    .progressViewStyle(CircularProgressViewStyle(tint: .white))
                    .scaleEffect(1.5)

                Text(viewModel.statusMessage)
                    .font(.headline)
                    .foregroundStyle(.white)
            }
        }
    }
}

// MARK: - ScanResultListView

/// View for displaying scanned items before creating a bill
struct ScanResultListView: View {

    let scanResult: ScanResult

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
                        Spacer()
                        Text(item.price, format: .currency(code: "USD"))
                    }
                }
            }

            Section("Totals") {
                if let subtotal = scanResult.subtotal {
                    LabeledContent("Subtotal") {
                        Text(subtotal, format: .currency(code: "USD"))
                    }
                }
                if let tax = scanResult.tax {
                    LabeledContent("Tax") {
                        Text(tax, format: .currency(code: "USD"))
                    }
                }
                if let tip = scanResult.tip {
                    LabeledContent("Tip") {
                        Text(tip, format: .currency(code: "USD"))
                    }
                }
                if let total = scanResult.total {
                    LabeledContent("Total") {
                        Text(total, format: .currency(code: "USD"))
                            .fontWeight(.bold)
                    }
                }
            }
        }
        .navigationTitle("Scanned Items")
        .navigationBarTitleDisplayMode(.inline)
    }
}

// MARK: - Previews

#Preview("Scanner View") {
    NavigationStack {
        ScannerView()
    }
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
            )
        )
    }
}

#endif
