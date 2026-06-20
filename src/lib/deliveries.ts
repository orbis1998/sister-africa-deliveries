// Deliveries data layer — placeholder for Supabase queries.
// Real flow: supabase.from('deliveries').select().eq('courier_id', courier.id)
//            supabase.channel('deliveries').on('postgres_changes', ...) for realtime.
import { useEffect, useState } from "react";
import {
  MOCK_DELIVERIES,
  type Delivery,
  type DeliveryStatus,
  type DeliveryEvent,
} from "./mockData";

let store: Delivery[] = [...MOCK_DELIVERIES];
const listeners = new Set<() => void>();
const emit = () => listeners.forEach((l) => l());

export function useMyDeliveries(courierId: string | undefined) {
  const [data, setData] = useState<Delivery[]>(() =>
    courierId ? store.filter((d) => d.courier_id === courierId) : []
  );
  useEffect(() => {
    const sync = () =>
      setData(courierId ? store.filter((d) => d.courier_id === courierId) : []);
    listeners.add(sync);
    sync();
    return () => {
      listeners.delete(sync);
    };
  }, [courierId]);
  return data;
}

export function useDelivery(id: string | undefined) {
  const [d, setD] = useState<Delivery | undefined>(() => store.find((x) => x.id === id));
  useEffect(() => {
    const sync = () => setD(store.find((x) => x.id === id));
    listeners.add(sync);
    sync();
    return () => {
      listeners.delete(sync);
    };
  }, [id]);
  return d;
}

export function updateDeliveryStatus(
  id: string,
  status: DeliveryStatus,
  by: string,
  note?: string
) {
  const evt: DeliveryEvent = {
    id: `e-${Date.now()}`,
    at: new Date().toISOString(),
    status,
    by,
    note,
  };
  store = store.map((d) =>
    d.id === id ? { ...d, status, events: [...d.events, evt] } : d
  );
  emit();
}
