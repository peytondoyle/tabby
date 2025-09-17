import React from "react";
import { Button } from "@/components/ui/Button";
import { IconButton } from "@/components/ui/IconButton";
import { Card } from "@/components/ui/Card";
import { Modal } from "@/components/ui/Modal";

function Swatch({ label, token }: { label: string; token: string }) {
  return (
    <div className="flex items-center gap-3">
      <div className="h-6 w-6 rounded" style={{ background: `var(${token})` }} />
      <code className="text-sm text-[var(--ui-text-dim)]">{label} ({token})</code>
    </div>
  );
}

export default function Ui() {
  const [open, setOpen] = React.useState(false);

  return (
    <div className="min-h-screen px-5 py-6 md:px-8 space-y-8" style={{ background: "var(--ui-bg)", color: "var(--ui-text)" }}>
      <header className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <h1 className="text-2xl font-semibold">UI Playground</h1>
        <div className="flex items-center gap-2">
          <Button variant="secondary" onClick={() => setOpen(true)}>Open Modal</Button>
        </div>
      </header>

      <section className="grid gap-6 md:grid-cols-2">
        <Card className="p-5">
          <h2 className="mb-4 text-lg font-medium">Buttons</h2>
          <div className="flex flex-wrap items-center gap-3">
            <Button>Primary</Button>
            <Button variant="secondary">Secondary</Button>
            <Button variant="subtle">Subtle</Button>
            <Button variant="ghost">Ghost</Button>
            <Button variant="destructive">Destructive</Button>
            <IconButton>🗑️</IconButton>
            <IconButton tone="danger">🗑️</IconButton>
          </div>
        </Card>

        <Card className="p-5">
          <h2 className="mb-4 text-lg font-medium">Tokens</h2>
          <div className="grid gap-3 sm:grid-cols-2 md:grid-cols-3">
            <Swatch label="bg" token="--ui-bg" />
            <Swatch label="panel" token="--ui-panel" />
            <Swatch label="panel-2" token="--ui-panel-2" />
            <Swatch label="border" token="--ui-border" />
            <Swatch label="text" token="--ui-text" />
            <Swatch label="text-dim" token="--ui-text-dim" />
            <Swatch label="primary" token="--ui-primary" />
            <Swatch label="danger" token="--ui-danger" />
            <Swatch label="success" token="--ui-success" />
          </div>
        </Card>

        <Card className="p-5 md:col-span-2">
          <h2 className="mb-4 text-lg font-medium">Cards & Layout</h2>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            <Card className="p-4 bg-[var(--ui-panel-2)]">
              <div className="text-sm text-[var(--ui-text-dim)] mb-2">Receipt Item</div>
              <div className="flex items-center justify-between">
                <div>🥗 Cobb Salad</div>
                <div>$9.95</div>
              </div>
            </Card>
            <Card className="p-4 bg-[var(--ui-panel-2)]">
              <div className="text-sm text-[var(--ui-text-dim)] mb-2">Assigned</div>
              <div className="flex items-center justify-between">
                <div>🍟 Fries</div>
                <div>$2.75</div>
              </div>
            </Card>
            <Card className="p-4 bg-[var(--ui-panel-2)]">
              <div className="text-sm text-[var(--ui-text-dim)] mb-2">Unassigned</div>
              <div className="flex items-center justify-between">
                <div>🍗 Nuggets</div>
                <div>$6.50</div>
              </div>
            </Card>
          </div>
        </Card>
      </section>

      <Modal open={open} onClose={() => setOpen(false)} title="Modal Preview"
        footer={
          <>
            <Button variant="secondary" onClick={() => setOpen(false)}>Cancel</Button>
            <Button onClick={() => setOpen(false)}>Confirm</Button>
          </>
        }>
        <p className="text-[var(--ui-text-dim)]">This is how modals inherit colors from the active palette.</p>
      </Modal>
    </div>
  );
}