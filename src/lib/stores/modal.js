import { writable } from 'svelte/store';

export const activeModal = writable(null);

export function closeModal() {
  activeModal.set(null);
}
