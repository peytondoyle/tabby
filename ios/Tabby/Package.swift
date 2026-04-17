// swift-tools-version: 5.9
import PackageDescription

let package = Package(
    name: "Tabby",
    platforms: [
        .iOS(.v17),
        .macOS(.v14)
    ],
    products: [
        .library(
            name: "Tabby",
            targets: ["Tabby"]
        ),
    ],
    dependencies: [
        .package(
            url: "https://github.com/supabase/supabase-swift",
            from: "2.0.0"
        )
    ],
    targets: [
        .target(
            name: "Tabby",
            dependencies: [
                .product(name: "Supabase", package: "supabase-swift")
            ],
            path: "Sources/Tabby",
            exclude: [
                "App/TabbyApp.swift",  // Exclude @main for library target
                "Resources/Info.plist"  // Info.plist is for iOS app target, not library
            ]
        ),
        .testTarget(
            name: "TabbyTests",
            dependencies: ["Tabby"],
            path: "Tests"
        ),
    ]
)
