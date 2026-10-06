/** Staff tecnico: mercato, assunzioni, licenziamenti. */
import { generateStaff, STAFF_ROLES } from './generation';
import { newId } from './pairs';
import type { Rng } from './rng';
import type { GameState, StaffMember } from './types';

export function generateStaffMarket(state: GameState, rng: Rng): StaffMember[] {
  const out: StaffMember[] = [];
  for (const role of STAFF_ROLES) {
    const levels = rng.shuffle([1, 2, 3, 4, 5]).slice(0, 3);
    for (const lv of levels) out.push(generateStaff(rng, newId(state, 's'), role, lv));
  }
  return out;
}

/** Buonuscita per il licenziamento: 4 settimane di stipendio. */
export const severance = (m: StaffMember): number => m.weeklySalary * 4;

/** Costo una tantum di ingaggio: 2 settimane di stipendio. */
export const hiringFee = (m: StaffMember): number => m.weeklySalary * 2;
