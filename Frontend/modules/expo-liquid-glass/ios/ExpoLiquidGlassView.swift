import ExpoModulesCore
import SwiftUI

/// A native view that wraps Apple's Liquid Glass effect (iOS 26+).
/// Requires Xcode 26 and iOS 26 SDK.
public class ExpoLiquidGlassView: ExpoView {
  var glassVariant: String = "regular"
  var isInteractive: Bool = false
  var cornerRadius: Double = 16.0

  private var hostingController: UIHostingController<AnyView>?

  required init(appContext: AppContext? = nil) {
    super.init(appContext: appContext)
    setupLiquidGlassView()
  }

  private func setupLiquidGlassView() {
    let hosting = UIHostingController(rootView: AnyView(createGlassView()))
    hosting.view.backgroundColor = .clear
    hosting.view.translatesAutoresizingMaskIntoConstraints = false
    addSubview(hosting.view)

    NSLayoutConstraint.activate([
      hosting.view.topAnchor.constraint(equalTo: topAnchor),
      hosting.view.leadingAnchor.constraint(equalTo: leadingAnchor),
      hosting.view.trailingAnchor.constraint(equalTo: trailingAnchor),
      hosting.view.bottomAnchor.constraint(equalTo: bottomAnchor)
    ])

    hostingController = hosting
  }

  func updateGlassView() {
    hostingController?.rootView = AnyView(createGlassView())
  }

  @ViewBuilder
  private func createGlassView() -> some View {
    if #available(iOS 26.0, *) {
      LiquidGlassSwiftUIView(
        variant: glassVariant,
        interactive: isInteractive,
        cornerRadius: cornerRadius
      )
    } else {
      FallbackGlassView(cornerRadius: cornerRadius)
    }
  }

  public override func layoutSubviews() {
    super.layoutSubviews()
    hostingController?.view.frame = bounds
  }
}

// MARK: - SwiftUI Liquid Glass (iOS 26+)
@available(iOS 26.0, *)
struct LiquidGlassSwiftUIView: View {
  let variant: String
  let interactive: Bool
  let cornerRadius: Double

  var body: some View {
    Color.clear
      .frame(maxWidth: .infinity, maxHeight: .infinity)
      .glassEffect(glassConfig, in: RoundedRectangle(cornerRadius: cornerRadius))
  }

  private var glassConfig: Glass {
    var config: Glass = .regular
    if variant == "clear" {
      config = .clear
    } else if variant == "thick" {
      config = .thick
    }
    if interactive {
      config = config.interactive()
    }
    return config
  }
}

// MARK: - Fallback for iOS < 26
struct FallbackGlassView: View {
  let cornerRadius: Double

  var body: some View {
    RoundedRectangle(cornerRadius: cornerRadius)
      .fill(.ultraThinMaterial)
      .frame(maxWidth: .infinity, maxHeight: .infinity)
  }
}
