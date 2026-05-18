#if os(iOS)
import SwiftUI
import UIKit

enum TBAppearance {
    static func configure() {
        let bg = UIColor(TB.Palette.bg)
        let ink = UIColor(TB.Palette.ink)
        let clay = UIColor(TB.Palette.clay)
        let ruleStrong = UIColor(TB.Palette.ruleStrong)

        let nav = UINavigationBarAppearance()
        nav.configureWithOpaqueBackground()
        nav.backgroundColor = bg
        nav.titleTextAttributes = [
            .foregroundColor: ink,
            .font: UIFont(name: "Inter-SemiBold", size: 17) ?? .systemFont(ofSize: 17, weight: .semibold)
        ]
        UINavigationBar.appearance().standardAppearance = nav
        UINavigationBar.appearance().scrollEdgeAppearance = nav
        UINavigationBar.appearance().compactAppearance = nav
        UINavigationBar.appearance().tintColor = clay

        let tab = UITabBarAppearance()
        tab.configureWithOpaqueBackground()
        tab.backgroundColor = bg
        tab.shadowColor = ruleStrong
        tab.shadowImage = UIImage()
        UITabBar.appearance().standardAppearance = tab
        UITabBar.appearance().scrollEdgeAppearance = tab
        UITabBar.appearance().tintColor = clay
        UITabBar.appearance().unselectedItemTintColor = UIColor(TB.Palette.inkFaint)

        // Top hairline on tab bar
        UITabBar.appearance().backgroundImage = UIImage()
    }
}
#endif
