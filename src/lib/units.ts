import type { Units } from './types';

export const KG_PER_LB = 0.45359237;

export function kgToDisplay(kg: number, units: Units): number {
  return units === 'imperial' ? kg / KG_PER_LB : kg;
}

export function displayToKg(value: number, units: Units): number {
  return units === 'imperial' ? value * KG_PER_LB : value;
}

export function weightUnitLabel(units: Units): string {
  return units === 'imperial' ? 'lb' : 'kg';
}

export function formatWeight(kg: number, units: Units, digits = 1): string {
  return `${kgToDisplay(kg, units).toFixed(digits)} ${weightUnitLabel(units)}`;
}

export function heightUnitLabel(units: Units): string {
  return units === 'imperial' ? 'in' : 'cm';
}

export function cmToDisplay(cm: number, units: Units): number {
  return units === 'imperial' ? cm / 2.54 : cm;
}

export function displayToCm(value: number, units: Units): number {
  return units === 'imperial' ? value * 2.54 : value;
}
