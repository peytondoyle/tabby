import SwiftUI
import AVFoundation

#if canImport(UIKit)
import UIKit

/// UIViewRepresentable wrapper for AVCaptureVideoPreviewLayer
/// Provides a live camera preview for receipt scanning
struct CameraPreview: UIViewRepresentable {

    /// The capture session to display
    let session: AVCaptureSession

    func makeUIView(context: Context) -> CameraPreviewUIView {
        let view = CameraPreviewUIView()
        view.videoPreviewLayer.session = session
        view.videoPreviewLayer.videoGravity = .resizeAspectFill
        return view
    }

    func updateUIView(_ uiView: CameraPreviewUIView, context: Context) {
        // Update session if needed
        uiView.videoPreviewLayer.session = session
    }
}

/// Custom UIView that uses AVCaptureVideoPreviewLayer as its backing layer
final class CameraPreviewUIView: UIView {

    override class var layerClass: AnyClass {
        AVCaptureVideoPreviewLayer.self
    }

    var videoPreviewLayer: AVCaptureVideoPreviewLayer {
        layer as! AVCaptureVideoPreviewLayer
    }

    override func layoutSubviews() {
        super.layoutSubviews()
        videoPreviewLayer.frame = bounds
    }
}

#Preview {
    CameraPreview(session: AVCaptureSession())
        .ignoresSafeArea()
}

#endif
