import { useState, useRef, useEffect } from 'react';
import { Bot, X, Send, Loader2, Sparkles, AlertCircle } from 'lucide-react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { askAssistantRV, AssistantContext } from '../services/geminiService';
import { toast } from 'react-hot-toast';

interface Message {
    id: string;
    role: 'user' | 'assistant' | 'system';
    content: string;
}

interface AssistantRVProps {
    isOpen: boolean;
    setIsOpen: (open: boolean) => void;
    context: AssistantContext;
}

export const AssistantRV = ({ isOpen, setIsOpen, context }: AssistantRVProps) => {
    const [messages, setMessages] = useState<Message[]>([
        {
            id: 'welcome',
            role: 'assistant',
            content: `Olá, ${context.userName}! Sou o Assistente RV ✨\n\nEstou conectado aos seus dados e vejo que você tem ${context.stats.activeClients} clientes listados na base agora. Como posso ajudar com suas análises hoje?`
        }
    ]);
    const [inputValue, setInputValue] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const messagesEndRef = useRef<HTMLDivElement>(null);

    // Auto-scroll to bottom of chat
    const scrollToBottom = () => {
        messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    };

    useEffect(() => {
        scrollToBottom();
    }, [messages, isLoading, isOpen]);

    if (!isOpen) {
        return (
            <button
                onClick={() => setIsOpen(true)}
                className="fixed bottom-6 right-6 w-14 h-14 bg-primary text-on-primary rounded-full shadow-elevation-3 flex items-center justify-center hover:scale-105 transition-transform z-40 group"
                title="Falar com Assistente RV"
            >
                <Sparkles className="w-6 h-6 animate-pulse" />
                <span className="absolute right-full mr-4 bg-surface-variant text-on-surface-variant text-xs font-medium px-2 py-1 rounded shadow-sm opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap pointer-events-none">
                    Assistente RV
                </span>
            </button>
        );
    }

    const handleSend = async () => {
        if (!inputValue.trim() || isLoading) return;

        const userMsg = inputValue.trim();
        setInputValue('');

        // Add User specific styling in msg
        const newMsg: Message = { id: Date.now().toString(), role: 'user', content: userMsg };
        setMessages(prev => [...prev, newMsg]);
        setIsLoading(true);

        try {
            const responseText = await askAssistantRV(userMsg, context);

            const assistantMsg: Message = {
                id: (Date.now() + 1).toString(),
                role: 'assistant',
                content: responseText
            };

            setMessages(prev => [...prev, assistantMsg]);
        } catch (err: unknown) {
            console.error(err);
            toast.error("Erro ao contactar a IA.");
            const errorMessage = err instanceof Error ? err.message : "Ocorreu um erro ao processar sua solicitação. Tente enviar de novo.";
            setMessages(prev => [
                ...prev,
                { id: (Date.now() + 1).toString(), role: 'system', content: errorMessage }
            ]);
        } finally {
            setIsLoading(false);
        }
    };

    const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
        if (e.key === 'Enter' && !e.shiftKey) {
            e.preventDefault();
            handleSend();
        }
    };

    return (
        <div className="fixed bottom-6 right-6 w-96 h-[600px] max-h-[85vh] bg-surface rounded-2xl shadow-elevation-4 border border-outline-variant flex flex-col z-50 overflow-hidden animate-in slide-in-from-bottom-5 fade-in duration-300">
            {/* Header */}
            <div className="bg-primary p-4 flex items-center justify-between text-on-primary">
                <div className="flex items-center gap-3">
                    <div className="w-10 h-10 bg-on-primary/10 rounded-full flex items-center justify-center">
                        <Bot className="w-5 h-5 text-on-primary" />
                    </div>
                    <div>
                        <h3 className="font-bold text-sm">Assistente RV ✨</h3>
                        <p className="text-[10px] opacity-80 mt-0.5">Visão Macro: {context.stats.totalClients} clientes</p>
                    </div>
                </div>
                <button
                    onClick={() => setIsOpen(false)}
                    className="p-2 hover:bg-on-primary/10 rounded-full transition-colors"
                    title="Fechar Assistente"
                >
                    <X className="w-4 h-4" />
                </button>
            </div>

            {/* Warning banner on strict mode */}
            {context.filteredData && context.filteredData.length > 30000 && (
                <div className="bg-primary/10 text-primary p-2 text-[10px] flex items-center gap-2 border-b border-primary/20">
                    <Sparkles className="w-3 h-3 shrink-0" />
                    Inteligência Macro ativada para toda a sua base de dados.
                </div>
            )}

            {/* Messages */}
            <div className="flex-1 overflow-y-auto p-4 space-y-4 custom-scrollbar bg-surface-container-lowest">
                {messages.map((msg) => (
                    <div
                        key={msg.id}
                        className={`flex flex-col max-w-[85%] ${msg.role === 'user' ? 'ml-auto items-end' : 'mr-auto items-start'}`}
                    >
                        <div
                            className={`p-3 rounded-2xl text-sm ${msg.role === 'user'
                                ? 'bg-primary-container text-on-primary-container rounded-tr-sm'
                                : msg.role === 'system'
                                    ? 'bg-error-container text-on-error-container rounded-tl-sm text-xs italic'
                                    : 'bg-surface-variant text-on-surface-variant rounded-tl-sm border border-outline-variant/30'
                                }`}
                        >
                            {msg.role === 'user' || msg.role === 'system' ? (
                                <p className="whitespace-pre-wrap">{msg.content}</p>
                            ) : (
                                <div className="prose prose-sm prose-p:leading-relaxed prose-a:text-primary max-w-none">
                                    <ReactMarkdown remarkPlugins={[remarkGfm]}>
                                        {msg.content}
                                    </ReactMarkdown>
                                </div>
                            )}
                        </div>
                        <span className="text-[10px] text-on-surface-variant/60 mt-1 px-1">
                            {msg.role === 'user' ? 'Você' : 'Assistente'}
                        </span>
                    </div>
                ))}

                {isLoading && (
                    <div className="flex flex-col max-w-[85%] mr-auto items-start">
                        <div className="p-4 rounded-2xl rounded-tl-sm bg-surface-variant text-on-surface-variant flex items-center gap-2">
                            <Loader2 className="w-4 h-4 animate-spin text-primary" />
                            <span className="text-xs font-medium">Analisando dados...</span>
                        </div>
                    </div>
                )}
                <div ref={messagesEndRef} />
            </div>

            {/* Input Area */}
            <div className="p-3 bg-surface border-t border-outline-variant">
                <div className="flex items-end gap-2 bg-surface-container-highest p-1.5 rounded-xl border border-outline-variant focus-within:border-primary focus-within:ring-1 focus-within:ring-primary transition-all">
                    <input
                        type="text"
                        className="flex-1 bg-transparent p-2 text-sm text-on-surface outline-none placeholder:text-on-surface-variant/50"
                        placeholder="Pergunte algo sobre os dados..."
                        value={inputValue}
                        onChange={(e) => setInputValue(e.target.value)}
                        onKeyDown={handleKeyDown}
                        disabled={isLoading}
                    />
                    <button
                        onClick={handleSend}
                        disabled={!inputValue.trim() || isLoading}
                        className="p-2.5 bg-primary text-on-primary rounded-lg hover:bg-primary/90 disabled:opacity-50 disabled:cursor-not-allowed transition-colors shrink-0"
                        title="Enviar mensagem"
                    >
                        <Send className="w-4 h-4" />
                    </button>
                </div>
                <p className="text-[9px] text-center text-on-surface-variant/70 mt-2">
                    A IA pode cometer erros. Verifique informações importantes.
                </p>
            </div>
        </div>
    );
};
