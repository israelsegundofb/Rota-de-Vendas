import { generateAIContent } from './services/aiService';
import { syncMasterData } from './services/toolsService';

const runTest = async () => {
    // Populate some fake memory data to test mathematical extraction
    const fakeClients = [
        { companyName: 'Bar do Zé', city: 'São Paulo', mainCnae: '47.44-0-01' },
        { companyName: 'Padaria Lua', city: 'São Paulo', mainCnae: '47.44-0-01' },
        { companyName: 'Mercado Sol', city: 'Campinas', mainCnae: '47.44-0-01' },
        { companyName: 'Borracharia Top', city: 'São Paulo', mainCnae: '11.11-1-11' }
    ];
    syncMasterData(fakeClients, []);

    // Ask a question that requires the get_market_segment_stats tool
    const prompt = 'User question: Quais e quantos clientes tem o CNAE 47.44-0-01 na nossa base atual e me diga uma amostra das cidades deles? Seja objetivo.';
    
    console.log("Starting test prompt...");
    try {
        const response: any = await generateAIContent('gemini-2.0-flash', prompt);
        console.log("FINAL AI RESPONSE:");
        console.log(typeof response.text === 'function' ? response.text() : response);
    } catch (e) {
        console.error("Test Error:", e);
    }
}

runTest();
