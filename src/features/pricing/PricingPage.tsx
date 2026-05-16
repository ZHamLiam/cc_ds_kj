import { useState } from "react";
import { usePricingStore } from "../../stores/pricing";
import { TemplateForm } from "./components/TemplateForm";
import { Button } from "../../components/ui/button";

export function PricingPage() {
  const { templates, currentTemplateId, addTemplate, setCurrentTemplateId, deleteTemplate } =
    usePricingStore();
  const [showForm, setShowForm] = useState(false);

  const currentTemplate = templates.find((t) => t.id === currentTemplateId);

  return (
    <div className="p-6 max-w-5xl mx-auto space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-semibold">定价模板</h2>
          <p className="text-sm text-muted-foreground mt-1">
            管理定价模板，自动计算建议售价和利润
          </p>
        </div>
        <Button onClick={() => setShowForm(true)}>新建模板</Button>
      </div>

      {templates.length === 0 && !showForm && (
        <div className="text-center py-12 text-muted-foreground">
          <p>还没有定价模板</p>
          <Button variant="outline" className="mt-2" onClick={() => setShowForm(true)}>
            创建第一个模板
          </Button>
        </div>
      )}

      {showForm && (
        <div className="border rounded-lg p-6">
          <TemplateForm
            initial={currentTemplate}
            onSave={(t) => {
              addTemplate(t);
              setShowForm(false);
            }}
          />
          <Button variant="ghost" className="mt-2" onClick={() => setShowForm(false)}>
            取消
          </Button>
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        {templates.map((t) => (
          <div
            key={t.id}
            className={`border rounded-lg p-4 cursor-pointer transition-colors hover:bg-accent ${
              currentTemplateId === t.id ? "ring-2 ring-primary" : ""
            }`}
            onClick={() => {
              setCurrentTemplateId(t.id);
              setShowForm(true);
            }}
          >
            <div className="flex items-center justify-between">
              <h3 className="font-medium text-sm">{t.name}</h3>
              <Button
                variant="ghost"
                size="icon"
                className="h-7 w-7 text-destructive"
                onClick={(e) => {
                  e.stopPropagation();
                  deleteTemplate(t.id);
                }}
              >
                ×
              </Button>
            </div>
            <p className="text-xs text-muted-foreground">
              {t.platform} · {t.region}
            </p>
          </div>
        ))}
      </div>
    </div>
  );
}
