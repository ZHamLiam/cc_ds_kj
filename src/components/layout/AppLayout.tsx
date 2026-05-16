import { Sidebar } from "./Sidebar";
import { useAppStore } from "../../stores/app";
import { TranslatePopupPage } from "../../features/translate-popup/TranslatePopupPage";
import { TitleTranslatePage } from "../../features/title-translate/TitleTranslatePage";
import { TitleOptimizePage } from "../../features/title-optimize/TitleOptimizePage";
import { PricingPage } from "../../features/pricing/PricingPage";
import { ProductAnalysisPage } from "../../features/product-analysis/ProductAnalysisPage";
import { SettingsPage } from "../../features/settings/SettingsPage";

function PlaceholderPage({ title }: { title: string }) {
  return (
    <div className="p-6">
      <h2 className="text-xl font-semibold">{title}</h2>
      <p className="text-sm text-muted-foreground mt-1">功能开发中...</p>
    </div>
  );
}

export function AppLayout() {
  const { currentPage } = useAppStore();

  const renderPage = () => {
    switch (currentPage) {
      case "translate-popup":
        return <TranslatePopupPage />;
      case "title-translate":
        return <TitleTranslatePage />;
      case "title-optimize":
        return <TitleOptimizePage />;
      case "pricing":
        return <PricingPage />;
      case "product-analysis":
        return <ProductAnalysisPage />;
      case "settings":
        return <SettingsPage />;
      default:
        return <PlaceholderPage title="划词翻译" />;
    }
  };

  return (
    <div className="flex h-screen">
      <Sidebar />
      <main className="flex-1 overflow-auto">{renderPage()}</main>
    </div>
  );
}
