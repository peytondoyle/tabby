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
            url: "https://github.com/clerk/clerk-ios",
            from: "1.0.0"
        )
    ],
    targets: [
        .target(
            name: "Tabby",
            dependencies: [
                .product(name: "ClerkKit", package: "clerk-ios"),
                .product(name: "ClerkKitUI", package: "clerk-ios")
            ],
            path: "Sources/Tabby",
            exclude: [
                "App/TabbyApp.swift",
                "Resources/Info.plist"
            ],
            resources: [
                .copy("Resources/Fonts")
            ]
        ),
        .testTarget(
            name: "TabbyTests",
            dependencies: ["Tabby"],
            path: "Tests"
        ),
    ]
)
