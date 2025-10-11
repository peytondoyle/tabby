import { useFlowStore } from '@/lib/flowStore';

export function useFlowAdapter() {
  const bill = useFlowStore(state => state.bill);
  const people = useFlowStore(state => state.people);
  const items = useFlowStore(state => state.items);
  const assignments = useFlowStore(state => state.assignments);
  const computeTotals = useFlowStore(state => state.computeTotals);
  
  return { 
    bill, 
    people, 
    items, 
    assignments, 
    computeTotals 
  };
}
