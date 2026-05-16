import { useAppStore } from "../../stores/app";
import { cn } from "../../lib/utils";

const navItems = [
  { id: "translate-popup", label: "划词翻译" },
  { id: "title-translate", label: "标题翻译" },
  { id: "title-optimize", label: "标题优化" },
  { id: "pricing", label: "定价模板" },
  { id: "product-analysis", label: "选品分析" },
  { id: "settings", label: "设置" },
];

export function Sidebar() {
  const { currentPage, setCurrentPage } = useAppStore();

  return (
    <aside className="w-56 border-r bg-muted/30 h-screen flex flex-col">
      <div className="p-4 border-b">
        <h1 className="text-lg font-bold">跨境电商助手</h1>
        <p className="text-xs text-muted-foreground">Cross-Border E-Commerce</p>
      </div>
      <nav className="flex-1 p-2 space-y-1">
        {navItems.map((item) => (
          <button
            key={item.id}
            onClick={() => setCurrentPage(item.id)}
            className={cn(
              "w-full text-left px-3 py-2 rounded-md text-sm transition-colors",
              currentPage === item.id
                ? "bg-primary text-primary-foreground"
                : "hover:bg-accent hover:text-accent-foreground"
            )}
          >
            {item.label}
          </button>
        ))}
      </nav>
      <div className="p-3 border-t text-xs text-muted-foreground">
        v0.1.0
      </div>
    </aside>
  );
}
