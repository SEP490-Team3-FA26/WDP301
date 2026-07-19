const assert = require('assert');

// The exact filter logic from InventoryHistory.tsx
function filterItems(items, showOnlyDifferences) {
  return items.filter((item) => {
    if (!showOnlyDifferences) return true;
    const expectedQty = item.quantity;
    const actualQty = item.actualQty;
    return actualQty !== undefined && actualQty !== null && actualQty !== expectedQty;
  });
}

// Test cases
const mockItems = [
  { name: 'Med A', quantity: 10, actualQty: 10 },    // Match
  { name: 'Med B', quantity: 20, actualQty: 18 },    // Mismatch
  { name: 'Med C', quantity: 15, actualQty: null },  // Null actualQty
  { name: 'Med D', quantity: 30, actualQty: 30 },    // Match
  { name: 'Med E', quantity: 5, actualQty: 7 },      // Mismatch
];

console.log('Running Discrepancy Filter Unit Tests...');

// Case 1: showOnlyDifferences = false (Should return all items)
const resultAll = filterItems(mockItems, false);
assert.strictEqual(resultAll.length, 5, 'Should return all 5 items when filter is disabled');
console.log('✔ Passed: Filter disabled returns all records.');

// Case 2: showOnlyDifferences = true (Should return only items where actualQty !== expectedQty, and actualQty is valid)
const resultDiff = filterItems(mockItems, true);
assert.strictEqual(resultDiff.length, 2, 'Should return exactly 2 items with actual discrepancy');
assert.ok(resultDiff.some(i => i.name === 'Med B'), 'Should include Med B');
assert.ok(resultDiff.some(i => i.name === 'Med E'), 'Should include Med E');
assert.ok(!resultDiff.some(i => i.name === 'Med A'), 'Should NOT include Med A (matched)');
assert.ok(!resultDiff.some(i => i.name === 'Med C'), 'Should NOT include Med C (null actualQty)');
console.log('✔ Passed: Filter enabled filters out matched/null records correctly.');

console.log('All tests passed successfully!');
