/* Standard destructive confirm */
import { Modal } from "@/components/ui/Modal";
import { Button } from "@/components/ui/Button";

export function ConfirmDeleteModal({
  open, onClose, onConfirm, billName,
}: { open: boolean; onClose: () => void; onConfirm: () => Promise<void> | void; billName: string; }) {
  return (
    <Modal open={open} onClose={onClose} title="Delete Bill?" size="sm" danger
      footer={
        <>
          <Button variant="secondary" onClick={onClose}>Cancel</Button>
          <Button variant="destructive" onClick={onConfirm}>Delete</Button>
        </>
      }>
      <p className="text-[var(--ui-text-dim)]">Are you sure you want to delete "{billName}"? This action cannot be undone.</p>
    </Modal>
  );
}
