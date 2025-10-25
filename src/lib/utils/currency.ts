/**
 * Utility functions for currency formatting
 */

/**
 * Formats a number as currency with 2 decimal places
 * @param amount - The amount to format
 * @returns Formatted currency string (e.g., "123.45")
 */
export function formatCurrency(amount: number): string {
  return amount.toFixed(2);
}

/**
 * Formats a number as currency with dollar sign and 2 decimal places
 * @param amount - The amount to format
 * @returns Formatted currency string with dollar sign (e.g., "$123.45")
 */
export function formatCurrencyWithSymbol(amount: number): string {
  return `$${amount.toFixed(2)}`;
}

/**
 * Calculates the total for line items with proper decimal handling
 * @param quantity - The quantity
 * @param unitPrice - The unit price
 * @returns The total amount with 2 decimal places
 */
export function calculateLineTotal(quantity: number, unitPrice: number): number {
  return Math.round((quantity * unitPrice) * 100) / 100;
}

/**
 * Calculates subtotal from line items
 * @param lineItems - Array of line items with total property
 * @returns The subtotal with 2 decimal places
 */
export function calculateSubtotal(lineItems: Array<{ total: number }>): number {
  const subtotal = lineItems.reduce((sum, item) => sum + item.total, 0);
  return Math.round(subtotal * 100) / 100;
}

/**
 * Calculates tax amount
 * @param subtotal - The subtotal amount
 * @param taxRate - The tax rate as a decimal (e.g., 0.13 for 13%)
 * @returns The tax amount with 2 decimal places
 */
export function calculateTax(subtotal: number, taxRate: number = 0.13): number {
  const tax = subtotal * taxRate;
  return Math.round(tax * 100) / 100;
}

/**
 * Calculates total amount (subtotal + tax)
 * @param subtotal - The subtotal amount
 * @param tax - The tax amount
 * @returns The total amount with 2 decimal places
 */
export function calculateTotal(subtotal: number, tax: number): number {
  const total = subtotal + tax;
  return Math.round(total * 100) / 100;
}
