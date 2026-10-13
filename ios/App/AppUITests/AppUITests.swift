import XCTest
import CoreLocation

/// End-to-end launch and navigation checks for 10 Around.
///
/// - Never publishes a minyan (that would notify real users).
/// - Simulates a location in Reykjavik so test guests never show up in
///   real users' "active members nearby" counts.
/// - Every test that signs in as a guest ends with "Sign out", which deletes
///   the anonymous account server-side.
final class AppUITests: XCTestCase {

    private var app: XCUIApplication!
    private let springboard = XCUIApplication(bundleIdentifier: "com.apple.springboard")

    override func setUpWithError() throws {
        continueAfterFailure = false
        app = XCUIApplication()
        app.launchArguments += ["-AppleLanguages", "(en)", "-AppleLocale", "en_US"]
        if #available(iOS 16.4, *) {
            XCUIDevice.shared.location = XCUILocation(
                location: CLLocation(latitude: 64.1466, longitude: -21.9426)
            )
        }
    }

    // MARK: - Tests

    /// 10 cold launches in a row: the app must stay alive and render content each time.
    func test01_ColdLaunchTenTimes() throws {
        for attempt in 1...10 {
            app.terminate()
            app.launch()
            // A freshly erased simulator is much slower on its very first launch.
            XCTAssertTrue(
                waitForAny(["Begin", "Home", "Skip"], timeout: attempt == 1 ? 90 : 30),
                "Launch \(attempt): no content rendered"
            )
            assertAlive("after launch \(attempt)")
        }
    }

    /// Full guest journey through every main screen, repeated, with background/foreground
    /// and kill/relaunch, while measuring memory, CPU and wall-clock time per loop.
    func test02_GuestJourneyAllScreens() throws {
        app.launch()
        signInAsGuestIfNeeded()

        let options = XCTMeasureOptions()
        options.iterationCount = 3
        measure(metrics: [XCTMemoryMetric(application: app), XCTCPUMetric(application: app), XCTClockMetric()],
                options: options) {
            navigateAllScreens()
        }

        // Background then foreground.
        XCUIDevice.shared.press(.home)
        sleep(2)
        app.activate()
        XCTAssertTrue(waitForAny(["Home", "Planned", "Profile"], timeout: 15), "Not restored from background")
        assertAlive("after background/foreground")

        // Kill and relaunch: the guest session must be restored straight to the map.
        app.terminate()
        app.launch()
        XCTAssertTrue(waitForAny(["Home"], timeout: 30), "Session not restored after relaunch")
        assertAlive("after kill/relaunch")

        navigateAllScreens()
        signOutGuest()
    }

    /// Launch time, measured by XCTest (cold and warm launches).
    func test03_LaunchPerformance() throws {
        measure(metrics: [XCTApplicationLaunchMetric(waitUntilResponsive: true)]) {
            app.launch()
        }
    }

    /// Scrolling smoothness (hitch rate) on the longest screen.
    func test04_ScrollSmoothness() throws {
        app.launch()
        signInAsGuestIfNeeded()
        tap("Profile")
        XCTAssertTrue(waitForAny(["Group chats", "Zmanim"], timeout: 10))

        let options = XCTMeasureOptions()
        options.invocationOptions = [.manuallyStop]
        measure(metrics: [XCTOSSignpostMetric.scrollingAndDecelerationMetric], options: options) {
            app.swipeUp(velocity: .fast)
            stopMeasuring()
            app.swipeDown(velocity: .fast)
        }
        assertAlive("after scrolling")
        signOutGuest()
    }

    // MARK: - Flows

    private func signInAsGuestIfNeeded() {
        if waitForAny(["Home"], timeout: 8) { return }

        if element("Begin").waitForExistence(timeout: 90) {
            tapUntil("Begin", shows: ["STEP 1"])
            // Go through the 3 slides with the bottom button, like a user would.
            tapUntil("Continue", shows: ["STEP 2"])
            tapUntil("Continue", shows: ["STEP 3"])
            tapUntil("Join the Network", shows: ["I accept the"])
        }

        // Terms step: tap the checkbox, or its label text (tapping a <label> toggles the box).
        let checkbox = app.descendants(matching: .any)
            .matching(NSPredicate(format: "elementType == %d OR elementType == %d",
                                  XCUIElement.ElementType.switch.rawValue,
                                  XCUIElement.ElementType.checkBox.rawValue)).firstMatch
        let termsText = app.descendants(matching: .any)
            .matching(NSPredicate(format: "label BEGINSWITH %@", "I accept the")).firstMatch
        if checkbox.waitForExistence(timeout: 15) {
            // The switch covers the whole row (box + text with Terms/Privacy links):
            // tap the box itself at the row's left, not the centre, which hits a link.
            checkbox.coordinate(withNormalizedOffset: CGVector(dx: 0.07, dy: 0.35)).tap()
            if element("Close").waitForExistence(timeout: 2) { element("Close").tap() }
        } else if termsText.waitForExistence(timeout: 5) {
            // The box sits just left of the text; tapping the text itself may hit the "Terms" link.
            termsText.coordinate(withNormalizedOffset: CGVector(dx: 0, dy: 0))
                .withOffset(CGVector(dx: -22, dy: 10)).tap()
            if element("Close").waitForExistence(timeout: 2) { element("Close").tap() }
        } else {
            add(XCTAttachment(string: app.debugDescription))
            XCTFail("Terms checkbox not found")
        }
        tapUntil("Continue", shows: ["Continue as Guest"])
        tapUntil("Continue as Guest", shows: ["Allow location", "Enable", "Home"])

        // Permission primers and the matching system alerts (each is optional).
        if element("Allow location").waitForExistence(timeout: 15) {
            tap("Allow location")
            tapSystemAlert(["Allow While Using App", "Allow Once", "Allow"])
        }
        if element("Enable").waitForExistence(timeout: 10) {
            tap("Skip")
        }
        tapSystemAlert(["Don’t Allow", "Don't Allow"])

        XCTAssertTrue(waitForAny(["Home"], timeout: 30), "Home not reached after guest sign-in")
        assertAlive("after guest sign-in")
    }

    private func navigateAllScreens() {
        tap("Home")
        XCTAssertTrue(waitForAny(["Home"], timeout: 10))
        assertAlive("home")

        tap("Planned")
        XCTAssertTrue(waitForAny(["Scheduled minyanim", "Trips abroad", "Planned"], timeout: 10), "Planned not shown")
        assertAlive("planned")

        tap("Profile")
        XCTAssertTrue(waitForAny(["Group chats", "Zmanim", "Profile"], timeout: 10), "Profile not shown")
        assertAlive("profile")

        tap("Zmanim")
        XCTAssertTrue(waitForAny(["Alot Hashachar", "Chatzot", "Zmanim"], timeout: 10), "Zmanim not shown")
        tap("Back")

        tap("Group chats")
        XCTAssertTrue(waitForAny(["Chats"], timeout: 10), "Chats not shown")
        tap("Back")

        tap("Settings")
        XCTAssertTrue(waitForAny(["Settings"], timeout: 10), "Settings not shown")
        tap("Back")

        // Create screen: open and leave without publishing.
        tap("Now")
        XCTAssertTrue(waitForAny(["Start a minyan"], timeout: 10), "Create screen not shown")
        assertAlive("create")
        tap("Back")

        XCTAssertTrue(waitForAny(["Home", "Profile"], timeout: 10))
        assertAlive("end of navigation loop")
    }

    private func signOutGuest() {
        tap("Profile")
        let signOut = element("Sign out")
        for _ in 0..<6 where !signOut.isHittable {
            app.swipeUp()
        }
        signOut.tap()
        XCTAssertTrue(waitForAny(["Skip", "Begin"], timeout: 20), "Did not return to onboarding after sign out")
        assertAlive("after sign out")
    }

    // MARK: - Helpers

    private func element(_ label: String) -> XCUIElement {
        app.descendants(matching: .any)
            .matching(NSPredicate(format: "label == %@ OR label BEGINSWITH %@", label, label + " "))
            .firstMatch
    }

    private func tap(_ label: String, file: StaticString = #filePath, line: UInt = #line) {
        let target = element(label)
        XCTAssertTrue(target.waitForExistence(timeout: 10), "\"\(label)\" not found", file: file, line: line)
        target.tap()
    }

    /// The web view can ignore a tap made right after a page change, so retry until the next screen shows.
    private func tapUntil(_ label: String, shows next: [String], file: StaticString = #filePath, line: UInt = #line) {
        for _ in 0..<5 {
            let target = element(label)
            if target.waitForExistence(timeout: 10) { target.tap() }
            if waitForAny(next, timeout: 6) { return }
        }
        add(XCTAttachment(string: app.debugDescription))
        XCTFail("\"\(label)\" did not lead to \(next)", file: file, line: line)
    }

    private func waitForAny(_ labels: [String], timeout: TimeInterval) -> Bool {
        let deadline = Date().addingTimeInterval(timeout)
        repeat {
            if labels.contains(where: { element($0).exists }) { return true }
            usleep(250_000)
        } while Date() < deadline
        return false
    }

    private func tapSystemAlert(_ buttons: [String]) {
        for title in buttons {
            let button = springboard.buttons[title]
            if button.waitForExistence(timeout: 4) {
                button.tap()
                return
            }
        }
    }

    private func assertAlive(_ context: String, file: StaticString = #filePath, line: UInt = #line) {
        XCTAssertEqual(app.state, .runningForeground, "App not running \(context)", file: file, line: line)
    }
}
