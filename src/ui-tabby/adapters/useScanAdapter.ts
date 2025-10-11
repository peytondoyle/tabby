import { parseReceipt } from '@/lib/receiptScanning';
import { useFlowStore } from '@/lib/flowStore';

export function useScanAdapter() {
  const setBillMeta = useFlowStore(state => state.setBillMeta);
  const replaceItems = useFlowStore(state => state.replaceItems);
  const addPerson = useFlowStore(state => state.addPerson);
  const people = useFlowStore(state => state.people);
  
  async function startScan(file: File) {
    const result = await parseReceipt(file);
    
    // Map to store format
    const flowItems = result.items.map(item => ({
      id: item.id,
      label: item.label,
      price: item.price,
      emoji: item.emoji || '🍽️'
    }));
    
    replaceItems(flowItems);
    setBillMeta({
      title: result.place || 'Scanned Receipt',
      place: result.place,
      date: result.date,
      total: result.total
    });
    
    // Ensure at least one person for assignment
    if (people.length === 0) {
      addPerson({
        id: 'you',
        name: 'You'
      });
    }
    
    return result;
  }
  
  return { startScan };
}
