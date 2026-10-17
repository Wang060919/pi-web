import { initializeLocale } from "../../shared/i18n";
import "./components/PiWebApp";

initializeLocale();

if (import.meta.env.DEV && import.meta.env.PI_WEB_DEVELOPMENT_DEMO) {
  void import("./previews/developmentDemo").then(({ mountDevelopmentDemoLauncher }) => {
    mountDevelopmentDemoLauncher();
  });
}
