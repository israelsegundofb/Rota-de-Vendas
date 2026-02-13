import React, { useState, useRef, useEffect } from 'react';
import { User, Send, Search, ArrowLeft, Check, CheckCheck, Clock, MessageSquare, Users } from 'lucide-react';
import { AppUser, ChatMessage, ChatConversation } from '../types';

interface ChatPanelProps {
    currentUser: AppUser;
    allUsers: AppUser[];
    conversations: ChatConversation[];
    messages: ChatMessage[];
    activeUserId: string | null;
    onSelectUser: (userId: string) => void;
    onSendMessage: (userId: string, text: string) => void;
    onClose?: () => void;
}

const ChatPanel: React.FC<ChatPanelProps> = ({
    currentUser,
    allUsers,
    conversations,
    messages,
    activeUserId,
    onSelectUser,
    onSendMessage,
    onClose
}) => {
    const [inputText, setInputText] = useState('');
    const [searchQuery, setSearchQuery] = useState('');
    const [activeTab, setActiveTab] = useState<'conversations' | 'users'>('conversations');
    const messagesEndRef = useRef<HTMLDivElement>(null);

    const activeUser = allUsers.find(u => u.id === activeUserId);
    const isMonitorMode = (currentUser.role === 'admin_dev' || currentUser.role === 'admin') && activeUserId;

    const filteredMessages = messages.filter(m => {
        if (!activeUserId) return false;

        // If normal user: see only messages with the other party
        // If Admin Dev: see ALL messages where the activeUserId is involved
        if (currentUser.role === 'admin_dev' || currentUser.role === 'admin') {
            return m.senderId === activeUserId || m.receiverId === activeUserId;
        }

        return (m.senderId === currentUser.id && m.receiverId === activeUserId) ||
            (m.senderId === activeUserId && m.receiverId === currentUser.id);
    });

    const filteredUsers = allUsers.filter(u =>
        u.id !== currentUser.id &&
        (u.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
            u.username.toLowerCase().includes(searchQuery.toLowerCase()))
    );

    useEffect(() => {
        messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }, [filteredMessages]);

    const handleSend = () => {
        if (inputText.trim() && activeUserId) {
            onSendMessage(activeUserId, inputText.trim());
            setInputText('');
        }
    };

    const getInitials = (name: string) => name.charAt(0).toUpperCase();

    const formatTime = (isoString: string) => {
        const date = new Date(isoString);
        return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    };

    return (
        <div className="flex flex-col h-full bg-white rounded-2xl shadow-xl border border-slate-200 overflow-hidden">
            {/* HEADER */}
            <div className="p-4 bg-slate-800 text-white flex items-center justify-between shadow-md">
                <div className="flex items-center gap-3">
                    {activeUserId ? (
                        <button
                            onClick={() => onSelectUser('')}
                            className="hover:bg-slate-700 p-1 rounded-full transition-colors md:hidden"
                            title="Voltar para lista de conversas"
                        >
                            <ArrowLeft className="w-5 h-5" />
                        </button>
                    ) : (
                        <MessageSquare className="w-6 h-6 text-blue-400" />
                    )}
                    <div>
                        <h2 className="font-bold text-sm">
                            {activeUserId ? activeUser?.name : 'Mensagens Internas'}
                        </h2>
                        <p className="text-[10px] text-slate-300">
                            {activeUserId ? activeUser?.role : 'Conectado como ' + currentUser.name}
                        </p>
                    </div>
                </div>
                {onClose && (
                    <button
                        onClick={onClose}
                        className="text-slate-400 hover:text-white transition-colors"
                        title="Fechar chat"
                    >
                        <Clock className="w-5 h-5" />
                    </button>
                )}
            </div>

            <div className="flex-1 flex overflow-hidden">
                {/* SIDEBAR (Contacts/Conversations) */}
                <div className={`w-full md:w-80 border-r border-slate-100 flex flex-col ${activeUserId ? 'hidden md:flex' : 'flex'}`}>
                    <div className="p-3 bg-slate-50 border-b border-slate-200">
                        <div className="relative">
                            <Search className="absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
                            <input
                                type="text"
                                value={searchQuery}
                                onChange={(e) => setSearchQuery(e.target.value)}
                                placeholder="Buscar colega..."
                                className="w-full pl-9 pr-3 py-2 bg-white border border-slate-200 rounded-full text-xs focus:ring-2 focus:ring-blue-500 focus:outline-none"
                            />
                        </div>

                        <div className="flex mt-3 bg-slate-200 p-1 rounded-lg">
                            <button
                                onClick={() => setActiveTab('conversations')}
                                className={`flex-1 py-1.5 text-[10px] font-bold rounded-md transition-all ${activeTab === 'conversations' ? 'bg-white text-blue-600 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}
                            >
                                Conversas
                            </button>
                            <button
                                onClick={() => setActiveTab('users')}
                                className={`flex-1 py-1.5 text-[10px] font-bold rounded-md transition-all ${activeTab === 'users' ? 'bg-white text-blue-600 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}
                            >
                                Contatos ({allUsers.length - 1})
                            </button>
                        </div>
                    </div>

                    <div className="flex-1 overflow-y-auto bg-white custom-scrollbar">
                        {activeTab === 'conversations' ? (
                            conversations.length > 0 ? (
                                conversations.map(conv => {
                                    const user = allUsers.find(u => u.id === conv.userId);
                                    if (!user) return null;
                                    return (
                                        <button
                                            key={conv.userId}
                                            onClick={() => onSelectUser(conv.userId)}
                                            className={`w-full p-4 flex items-center gap-3 border-b border-slate-50 transition-colors hover:bg-slate-50 ${activeUserId === conv.userId ? 'bg-blue-50/50' : ''}`}
                                        >
                                            <div className={`w-10 h-10 rounded-full flex items-center justify-center font-bold text-white text-xs shadow-sm ${user.role.includes('admin') ? 'bg-tertiary' : 'bg-secondary'}`}>
                                                {user.photoURL ? <img src={user.photoURL} alt="" className="w-full h-full object-cover rounded-full" /> : <span>{getInitials(user.name)}</span>}
                                            </div>
                                            <div className="flex-1 text-left min-w-0">
                                                <div className="flex justify-between items-baseline mb-0.5">
                                                    <h4 className="font-bold text-xs text-slate-800 truncate">{user.name}</h4>
                                                    {conv.lastMessage && <span className="text-[9px] text-slate-400">{formatTime(conv.lastMessage.timestamp)}</span>}
                                                </div>
                                                <p className="text-[10px] text-slate-500 truncate flex items-center gap-1">
                                                    {conv.lastMessage?.senderId === currentUser.id && <Check className="w-3 h-3" />}
                                                    {conv.lastMessage?.text || 'Sem mensagens...'}
                                                </p>
                                            </div>
                                            {conv.unreadCount > 0 && (
                                                <div className="bg-blue-600 text-white text-[9px] font-black h-5 w-5 rounded-full flex items-center justify-center shadow-md animate-pulse">
                                                    {conv.unreadCount}
                                                </div>
                                            )}
                                        </button>
                                    );
                                })
                            ) : (
                                <div className="p-8 text-center">
                                    <MessageSquare className="w-8 h-8 text-slate-300 mx-auto mb-3" />
                                    <p className="text-xs text-slate-400">Nenhuma conversa ativa.</p>
                                    <button onClick={() => setActiveTab('users')} className="mt-2 text-xs font-bold text-blue-500">Ver contatos</button>
                                </div>
                            )
                        ) : (
                            filteredUsers.map(user => (
                                <button
                                    key={user.id}
                                    onClick={() => onSelectUser(user.id)}
                                    className={`w-full p-4 flex items-center gap-3 border-b border-slate-50 transition-colors hover:bg-slate-50 ${activeUserId === user.id ? 'bg-blue-50/50' : ''}`}
                                >
                                    <div className={`w-10 h-10 rounded-full flex items-center justify-center font-bold text-white text-xs shadow-sm ${user.role.includes('admin') ? 'bg-tertiary' : 'bg-secondary'}`}>
                                        {user.photoURL ? <img src={user.photoURL} alt="" className="w-full h-full object-cover rounded-full" /> : <span>{getInitials(user.name)}</span>}
                                    </div>
                                    <div className="flex-1 text-left">
                                        <h4 className="font-bold text-xs text-slate-800">{user.name}</h4>
                                        <p className="text-[10px] text-slate-500 uppercase font-medium">{user.role.replace('_', ' ')}</p>
                                    </div>
                                </button>
                            ))
                        )}
                    </div>
                </div>

                {/* CHAT WINDOW */}
                <div className={`flex-1 flex flex-col bg-slate-50 ${!activeUserId ? 'hidden md:flex' : 'flex'}`}>
                    {activeUserId ? (
                        <>
                            {/* MESSAGE AREA */}
                            <div className="flex-1 overflow-y-auto p-4 space-y-4 custom-scrollbar">
                                {filteredMessages.map((msg, idx) => {
                                    const isMe = msg.senderId === currentUser.id;
                                    const isDirect = (msg.senderId === currentUser.id && msg.receiverId === activeUserId) ||
                                        (msg.senderId === activeUserId && msg.receiverId === currentUser.id);

                                    return (
                                        <div key={msg.id || idx} className={`flex ${isMe ? 'justify-end' : 'justify-start'} animate-fade-in`}>
                                            <div className={`max-w-[80%] rounded-2xl p-3 shadow-sm ${isMe ? 'bg-blue-600 text-white rounded-tr-none' :
                                                (isMonitorMode && !isDirect ? 'bg-slate-200 text-slate-700 border-dashed border-slate-400' : 'bg-white text-slate-800 rounded-tl-none border border-slate-100')
                                                }`}>
                                                {isMonitorMode && !isMe && (
                                                    <p className="text-[9px] font-black uppercase mb-1 opacity-60">
                                                        {allUsers.find(u => u.id === msg.senderId)?.name || 'Outro'} → {allUsers.find(u => u.id === msg.receiverId)?.name || 'Outro'}
                                                    </p>
                                                )}
                                                <p className="text-sm whitespace-pre-wrap">{msg.text}</p>
                                                <div className={`flex items-center gap-1 mt-1 justify-end ${isMe ? 'text-blue-100' : 'text-slate-400'}`}>
                                                    <span className="text-[9px]">{formatTime(msg.timestamp)}</span>
                                                    {isMe && (
                                                        msg.read ? <CheckCheck className="w-3 h-3" /> : <Check className="w-3 h-3" />
                                                    )}
                                                </div>
                                            </div>
                                        </div>
                                    );
                                })}
                                <div ref={messagesEndRef} />
                            </div>

                            {/* INPUT AREA */}
                            <div className="p-4 bg-white border-t border-slate-200">
                                <form
                                    onSubmit={(e) => { e.preventDefault(); handleSend(); }}
                                    className="flex items-center gap-2"
                                >
                                    <input
                                        type="text"
                                        value={inputText}
                                        onChange={(e) => setInputText(e.target.value)}
                                        placeholder="Digite sua mensagem..."
                                        className="flex-1 px-4 py-2 bg-slate-50 border border-slate-200 rounded-full text-sm focus:ring-2 focus:ring-blue-500 focus:outline-none"
                                    />
                                    <button
                                        type="submit"
                                        disabled={!inputText.trim()}
                                        className="p-2.5 bg-blue-600 text-white rounded-full shadow-md hover:bg-blue-700 disabled:bg-slate-300 disabled:shadow-none transition-all active:scale-95"
                                        title="Enviar mensagem"
                                    >
                                        <Send className="w-5 h-5" />
                                    </button>
                                </form>
                            </div>
                        </>
                    ) : (
                        <div className="flex-1 flex flex-col items-center justify-center p-8 text-center text-slate-400">
                            <div className="w-20 h-20 bg-slate-100 rounded-full flex items-center justify-center mb-6 border border-slate-200">
                                <Users className="w-10 h-10 text-slate-300" />
                            </div>
                            <h3 className="text-lg font-bold text-slate-600 mb-2">Seu Central de Comunicação</h3>
                            <p className="text-sm max-w-xs leading-relaxed">
                                Selecione um colega de equipe na lista ao lado para iniciar uma conversa em tempo real.
                            </p>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};

export default ChatPanel;
