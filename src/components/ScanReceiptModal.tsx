/* Reuses Modal for Take Photo / Analyzing steps */
import { Modal } from "@/components/ui/Modal";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";

export function ScanReceiptModal({
  open, onClose, onSelectFile, scanning, progressLabel,
}: { open: boolean; onClose: () => void; onSelectFile: (f: File) => void; scanning: boolean; progressLabel?: string; }) {
  return (
    <Modal open={open} onClose={onClose} title="Scan Receipt" size="md"
      footer={<Button variant="secondary" onClick={onClose}>Close</Button>}>
      {scanning ? (
        <div className="grid gap-4">
          <div className="flex items-center gap-3"><span className="text-xl">🔍</span><div>
            <div className="font-medium">Analyzing Receipt</div>
            <div className="text-sm text-[var(--ui-text-dim)]">{progressLabel ?? "Reading, extracting, preparing..."}</div>
          </div></div>
          <div className="h-2 w-full rounded-full bg-[var(--ui-subtle)] overflow-hidden">
            <div className="h-full w-1/2 animate-pulse bg-[var(--ui-primary)]" />
          </div>
        </div>
      ) : (
        <Card className="grid place-items-center p-8 text-center bg-[var(--ui-panel-2)]">
          <div className="text-3xl mb-2">📷</div>
          <div className="mb-5 text-[var(--ui-text-dim)]">AI will automatically extract items and prices</div>
          <label className="inline-block">
            <input type="file" accept="image/*" className="hidden" onChange={e => { const f=e.target.files?.[0]; if (f) onSelectFile(f); }} />
            <Button>Choose Image</Button>
          </label>
        </Card>
      )}
    </Modal>
  );
}
