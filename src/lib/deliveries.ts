import { useEffect, useState } from "react";
import { type Delivery, type DeliveryStatus, type DeliveryEvent } from "./deliveryTypes";
import { supabase } from "./supabase";

type DeliveryRow = Omit<Delivery, "events"> & {
  events?: DeliveryEvent[] | null;
  delivery_events?: DeliveryEvent[] | null;
};

const listeners = new Set<() => void | Promise<void>>();
const emit = () => listeners.forEach((l) => void l());

const selectDelivery = "*, events:delivery_events(*)";

function mapDelivery(row: DeliveryRow): Delivery {
  const events = row.events ?? row.delivery_events ?? [];
  const productAmount = row.product_amount_fcfa ?? 0;
  const deliveryFee = row.delivery_fee_fcfa ?? 0;
  const amount = row.amount_to_collect_fcfa ?? 0;

  return {
    ...row,
    product_amount_fcfa: productAmount || (deliveryFee ? 0 : amount),
    delivery_fee_fcfa: deliveryFee,
    amount_to_collect_fcfa: amount || productAmount + deliveryFee,
    events: [...events].sort((a, b) => +new Date(a.at) - +new Date(b.at)),
  };
}

async function fetchMyDeliveries(courierId: string) {
  const { data, error } = await supabase
    .from("deliveries")
    .select(selectDelivery)
    .eq("courier_id", courierId)
    .order("scheduled_for", { ascending: true });

  if (error) throw error;
  return ((data ?? []) as DeliveryRow[]).map(mapDelivery);
}

async function fetchDelivery(id: string) {
  const { data, error } = await supabase
    .from("deliveries")
    .select(selectDelivery)
    .eq("id", id)
    .maybeSingle();

  if (error) throw error;
  return data ? mapDelivery(data as DeliveryRow) : null;
}

function subscribeToDeliveryChanges(onChange: () => void | Promise<void>) {
  const channel = supabase
    .channel("delivery-data")
    .on("postgres_changes", { event: "*", schema: "public", table: "deliveries" }, onChange)
    .on("postgres_changes", { event: "*", schema: "public", table: "delivery_events" }, onChange)
    .subscribe();

  return () => {
    void supabase.removeChannel(channel);
  };
}

export function useMyDeliveries(courierId: string | undefined) {
  const [data, setData] = useState<Delivery[]>([]);

  useEffect(() => {
    if (!courierId) {
      setData([]);
      return;
    }

    let alive = true;
    const sync = async () => {
      try {
        const rows = await fetchMyDeliveries(courierId);
        if (alive) setData(rows);
      } catch (error) {
        console.error("Unable to load deliveries", error);
        if (alive) setData([]);
      }
    };

    listeners.add(sync);
    void sync();
    const unsubscribe = subscribeToDeliveryChanges(sync);

    return () => {
      alive = false;
      listeners.delete(sync);
      unsubscribe();
    };
  }, [courierId]);

  return data;
}

export function useDelivery(id: string | undefined) {
  const [d, setD] = useState<Delivery | null | undefined>(undefined);

  useEffect(() => {
    if (!id) {
      setD(null);
      return;
    }

    let alive = true;
    const sync = async () => {
      try {
        const row = await fetchDelivery(id);
        if (alive) setD(row);
      } catch (error) {
        console.error("Unable to load delivery", error);
        if (alive) setD(null);
      }
    };

    listeners.add(sync);
    void sync();
    const unsubscribe = subscribeToDeliveryChanges(sync);

    return () => {
      alive = false;
      listeners.delete(sync);
      unsubscribe();
    };
  }, [id]);

  return d;
}

export async function updateDeliveryStatus(
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

  const { error: deliveryError } = await supabase
    .from("deliveries")
    .update({ status })
    .eq("id", id);

  if (deliveryError) {
    return { error: deliveryError.message };
  }

  const { error: eventError } = await supabase.from("delivery_events").insert({
    id: evt.id,
    delivery_id: id,
    at: evt.at,
    status: evt.status,
    by: evt.by,
    note: evt.note,
  });

  if (eventError) {
    return { error: eventError.message };
  }

  emit();
  return {};
}
