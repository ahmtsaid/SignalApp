import ExpoModulesCore

public class ExpoLiquidGlassModule: Module {
  public func definition() -> ModuleDefinition {
    Name("ExpoLiquidGlass")

    View(ExpoLiquidGlassView.self) {
      Prop("variant") { (view: ExpoLiquidGlassView, variant: String) in
        view.glassVariant = variant
        view.updateGlassView()
      }
      Prop("interactive") { (view: ExpoLiquidGlassView, interactive: Bool) in
        view.isInteractive = interactive
        view.updateGlassView()
      }
      Prop("cornerRadius") { (view: ExpoLiquidGlassView, radius: Double) in
        view.cornerRadius = radius
        view.updateGlassView()
      }
    }
  }
}
