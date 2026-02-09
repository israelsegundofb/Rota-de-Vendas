// Script to clean duplicate clients from localStorage
// This file will be executed in the browser console

console.log("Starting duplicate client cleanup...");

// Load current clients from localStorage
const clientsJson = localStorage.getItem('vendas_ai_clients');
if (!clientsJson) {
    console.log("No clients found in localStorage");
} else {
    const clients = JSON.parse(clientsJson);
    console.log(`Total clients before cleanup: ${clients.length}`);

    // Find duplicates based on companyName + address
    const seen = new Map();
    const duplicates = [];
    const unique = [];

    clients.forEach((client, index) => {
        const key = `${client.companyName}-${client.address}`.toLowerCase();

        if (seen.has(key)) {
            duplicates.push({ index, client, original: seen.get(key) });
        } else {
            seen.set(key, client);
            unique.push(client);
        }
    });

    console.log(`Unique clients: ${unique.length}`);
    console.log(`Duplicate clients found: ${duplicates.length}`);

    if (duplicates.length > 0) {
        console.log("Sample duplicates:", duplicates.slice(0, 5));

        // Save cleaned list
        localStorage.setItem('vendas_ai_clients', JSON.stringify(unique));
        console.log(`✅ Cleanup complete! Removed ${duplicates.length} duplicate clients`);
        console.log(`New total: ${unique.length} clients`);

        // Reload page to see changes
        console.log("⚠️ Please reload the page to see the changes");
    } else {
        console.log("✅ No duplicates found!");
    }
}
