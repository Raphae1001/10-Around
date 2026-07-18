import UIKit
import Capacitor

/// Locks WKWebView so the app fills the iPhone screen like a native app —
/// no pinch-zoom, no horizontal pan of the whole page.
class AppViewController: CAPBridgeViewController, UIScrollViewDelegate {
  override func viewDidLoad() {
    super.viewDidLoad()
    lockWebView()
  }

  override func viewDidAppear(_ animated: Bool) {
    super.viewDidAppear(animated)
    lockWebView()
  }

  /// Capacitor finishes creating WKWebView here — more reliable than viewDidLoad alone.
  override open func capacitorDidLoad() {
    super.capacitorDidLoad()
    lockWebView()
  }

  private func lockWebView() {
    guard let webView, let scroll = webView.scrollView as UIScrollView? else { return }
    scroll.delegate = self
    scroll.minimumZoomScale = 1
    scroll.maximumZoomScale = 1
    scroll.zoomScale = 1
    scroll.bouncesZoom = false
    scroll.bounces = false
    scroll.alwaysBounceHorizontal = false
    scroll.alwaysBounceVertical = false
    scroll.showsHorizontalScrollIndicator = false
    scroll.pinchGestureRecognizer?.isEnabled = false
    scroll.panGestureRecognizer.maximumNumberOfTouches = 1
    scroll.contentInsetAdjustmentBehavior = .never
    // Kill any residual scale from a previous session / orientation.
    webView.scrollView.setZoomScale(1, animated: false)
  }

  func viewForZooming(in scrollView: UIScrollView) -> UIView? {
    nil
  }

  func scrollViewDidZoom(_ scrollView: UIScrollView) {
    if scrollView.zoomScale != 1 {
      scrollView.setZoomScale(1, animated: false)
    }
  }

  func scrollViewDidScroll(_ scrollView: UIScrollView) {
    // Prevent horizontal page pan if content briefly overflows.
    if scrollView.contentOffset.x != 0 {
      scrollView.contentOffset.x = 0
    }
  }
}
