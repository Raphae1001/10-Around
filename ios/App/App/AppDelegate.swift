import UIKit
import Capacitor

/// Keeps WKWebView at scale 1 — no pinch-zoom / horizontal page pan on iPhone.
final class WebViewZoomLock: NSObject, UIScrollViewDelegate {
  func apply(to bridge: CAPBridgeViewController) {
    guard let scroll = bridge.webView?.scrollView else { return }
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
    scroll.contentInsetAdjustmentBehavior = .never
    scroll.setZoomScale(1, animated: false)
  }

  func viewForZooming(in scrollView: UIScrollView) -> UIView? { nil }

  func scrollViewDidZoom(_ scrollView: UIScrollView) {
    if scrollView.zoomScale != 1 {
      scrollView.setZoomScale(1, animated: false)
    }
  }

  func scrollViewDidScroll(_ scrollView: UIScrollView) {
    if scrollView.contentOffset.x != 0 {
      scrollView.contentOffset.x = 0
    }
  }
}

@UIApplicationMain
class AppDelegate: UIResponder, UIApplicationDelegate {

    var window: UIWindow?
    private let webViewZoomLock = WebViewZoomLock()

    func application(_ application: UIApplication, didFinishLaunchingWithOptions launchOptions: [UIApplication.LaunchOptionsKey: Any]?) -> Bool {
        // WebView is created asynchronously — retry lock a few times after launch.
        for delay in [0.05, 0.25, 0.75, 1.5] as [TimeInterval] {
            DispatchQueue.main.asyncAfter(deadline: .now() + delay) { [weak self] in
                self?.lockWebView()
            }
        }
        return true
    }

    func applicationWillResignActive(_ application: UIApplication) {}

    func applicationDidEnterBackground(_ application: UIApplication) {}

    func applicationWillEnterForeground(_ application: UIApplication) {}

    func applicationDidBecomeActive(_ application: UIApplication) {
        lockWebView()
    }

    func applicationWillTerminate(_ application: UIApplication) {}

    func application(_ app: UIApplication, open url: URL, options: [UIApplication.OpenURLOptionsKey: Any] = [:]) -> Bool {
        return ApplicationDelegateProxy.shared.application(app, open: url, options: options)
    }

    func application(_ application: UIApplication, continue userActivity: NSUserActivity, restorationHandler: @escaping ([UIUserActivityRestoring]?) -> Void) -> Bool {
        return ApplicationDelegateProxy.shared.application(application, continue: userActivity, restorationHandler: restorationHandler)
    }

    // Forwards the APNs device token (or registration failure) to
    // @capacitor/push-notifications, which listens for these two
    // notifications. Without this, PushNotifications.register() silently
    // never resolves on the JS side — required manual step per the plugin's
    // own README, not covered by ApplicationDelegateProxy.
    func application(_ application: UIApplication, didRegisterForRemoteNotificationsWithDeviceToken deviceToken: Data) {
        NotificationCenter.default.post(
            name: .capacitorDidRegisterForRemoteNotifications,
            object: deviceToken
        )
    }

    func application(_ application: UIApplication, didFailToRegisterForRemoteNotificationsWithError error: Error) {
        NotificationCenter.default.post(
            name: .capacitorDidFailToRegisterForRemoteNotifications,
            object: error
        )
    }

    private func lockWebView() {
        guard let bridge = window?.rootViewController as? CAPBridgeViewController else { return }
        webViewZoomLock.apply(to: bridge)
    }
}
