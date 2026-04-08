const { performance } = require('perf_hooks');

const clients = [];
for (let i = 0; i < 5000; i++) {
  clients.push({
    companyName: 'Company ' + i + ' ABCDEFGHIJKL',
    ownerName: 'Owner ' + i + ' MNOPQRSTUVWXYZ',
    purchasedProducts: Array(20).fill(0).map((_, j) => ({
      name: 'Product ' + j + ' ' + i,
      sku: 'SKU' + j + i,
      brand: 'Brand ' + j,
      category: 'Category ' + j,
      section: 'Section ' + j,
      factoryCode: 'FC' + j + i,
      price: Math.random() * 100
    }))
  });
}

function testOld() {
    const start = performance.now();
    const query = 'mnopq'.toLowerCase();
    const prodQuery = 'brand 10'.toLowerCase();
    let matchCount = 0;

    for (let i = 0; i < clients.length; i++) {
        const c = clients[i];
        const matchSearch = query === '' ||
            (c.companyName || '').toLowerCase().includes(query) ||
            (c.ownerName || '').toLowerCase().includes(query);

        if (!matchSearch) continue;

        let matchProduct = false;
        let hasMatch = prodQuery === '';

        for (let j = 0; j < c.purchasedProducts.length; j++) {
            const p = c.purchasedProducts[j];
            if (!hasMatch) {
                hasMatch = (p.name || '').toLowerCase().includes(prodQuery) ||
                    (p.sku || '').toLowerCase().includes(prodQuery) ||
                    (p.brand || '').toLowerCase().includes(prodQuery) ||
                    (p.category || '').toLowerCase().includes(prodQuery) ||
                    (p.section || '').toLowerCase().includes(prodQuery) ||
                    (p.factoryCode || '').toLowerCase().includes(prodQuery) ||
                    (p.price || 0).toString().includes(prodQuery);
            }
            if (hasMatch) {
                matchProduct = true;
                break;
            }
        }
        if (matchProduct) matchCount++;
    }
    return { time: performance.now() - start, matchCount };
}

function testNew() {
    const start = performance.now();
    const q1 = 'mnopq';
    const q2 = 'brand 10';

    const escapedQuery = q1 ? q1.replace(/[.*+?^${}()|[\]\\]/g, '\\$&') : '';
    const searchRegex = escapedQuery ? new RegExp(escapedQuery, 'i') : null;

    const escapedProdQuery = q2 ? q2.replace(/[.*+?^${}()|[\]\\]/g, '\\$&') : '';
    const prodRegex = escapedProdQuery ? new RegExp(escapedProdQuery, 'i') : null;

    let matchCount = 0;

    for (let i = 0; i < clients.length; i++) {
        const c = clients[i];
        const matchSearch = !searchRegex ||
            searchRegex.test(c.companyName || '') ||
            searchRegex.test(c.ownerName || '');

        if (!matchSearch) continue;

        let matchProduct = false;
        let hasMatch = !prodRegex;

        for (let j = 0; j < c.purchasedProducts.length; j++) {
            const p = c.purchasedProducts[j];
            if (!hasMatch) {
                hasMatch = prodRegex.test(p.name || '') ||
                    prodRegex.test(p.sku || '') ||
                    prodRegex.test(p.brand || '') ||
                    prodRegex.test(p.category || '') ||
                    prodRegex.test(p.section || '') ||
                    prodRegex.test(p.factoryCode || '') ||
                    prodRegex.test((p.price || 0).toString());
            }
            if (hasMatch) {
                matchProduct = true;
                break;
            }
        }
        if (matchProduct) matchCount++;
    }
    return { time: performance.now() - start, matchCount };
}

console.log("Old:", testOld());
console.log("New:", testNew());
