import React, { useState, useEffect } from 'react';
import { User, Lock, ArrowRight, ShieldCheck, AlertCircle, Mail, ArrowLeft, Check, Send } from 'lucide-react';
import { User as UserType } from '../types';

interface LoginScreenProps {
  users: UserType[];
  onLogin: (user: UserType) => void;
}

const GOOGLE_CLIENT_ID = "66816750674-descnfnci3r7ae2mao0ntvigdja0ggla.apps.googleusercontent.com";

declare global {
  interface Window {
    google: any;
  }
}

type LoginView = 'login' | 'forgot_user' | 'forgot_pass';

const LoginScreen: React.FC<LoginScreenProps> = ({ users, onLogin }) => {
  const [view, setView] = useState<LoginView>('login');
  
  // Login Form State
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');

  // Recovery Form State
  const [recoveryEmail, setRecoveryEmail] = useState('');
  const [recoveryUsername, setRecoveryUsername] = useState('');
  const [successMessage, setSuccessMessage] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const parseJwt = (token: string) => {
    try {
      const base64Url = token.split('.')[1];
      const base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/');
      const jsonPayload = decodeURIComponent(atob(base64).split('').map((c) => {
        return '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2);
      }).join(''));
      return JSON.parse(jsonPayload);
    } catch (e) {
      return null;
    }
  };

  const handleGoogleResponse = (response: any) => {
    const payload = parseJwt(response.credential);
    if (payload) {
      // Create a user session from Google Profile
      const googleUser: UserType = {
        id: payload.sub,
        name: payload.name,
        username: payload.email, // Use email as username
        role: 'salesperson', // Default to salesperson for Google Logins
        salesCategory: 'Externo', // Default category
        password: '' // No password needed
      };
      
      // Check if user is already in our list (optional logic)
      const existing = users.find(u => u.username === payload.email);
      if (existing) {
         onLogin(existing);
      } else {
         onLogin(googleUser);
      }
    } else {
      setError("Falha ao processar login do Google.");
    }
  };

  const handleSimulatedLogin = () => {
    // Fallback for development environments where the origin is not whitelisted in Google Cloud
    const simUser: UserType = {
      id: 'google-sim-user',
      name: 'Israel Segundo (Simulado)',
      username: 'israelsegundofb@gmail.com',
      role: 'salesperson',
      salesCategory: 'Externo',
      password: ''
    };
    onLogin(simUser);
  };

  useEffect(() => {
    if (window.google && view === 'login') {
      try {
        window.google.accounts.id.initialize({
          client_id: GOOGLE_CLIENT_ID,
          callback: handleGoogleResponse
        });
        // FIX: width must be a number-like string in pixels, not percentage
        window.google.accounts.id.renderButton(
          document.getElementById("googleSignInDiv"),
          { theme: "outline", size: "large", width: "350", text: "continue_with" }
        );
      } catch (e) {
        console.error("Google Sign-In Init Error:", e);
      }
    }
  }, [view]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const user = users.find(u => u.username.toLowerCase() === username.toLowerCase());
    
    if (user && user.password === password) {
      onLogin(user);
    } else {
      setError('Credenciais inválidas. Tente novamente.');
    }
  };

  // --- RECOVERY LOGIC ---

  const resetRecoveryState = () => {
    setError('');
    setSuccessMessage('');
    setRecoveryEmail('');
    setRecoveryUsername('');
  };

  const switchView = (newView: LoginView) => {
    resetRecoveryState();
    setView(newView);
  };

  const handleRecoverUsername = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setIsLoading(true);

    // Simulate network delay
    await new Promise(resolve => setTimeout(resolve, 1500));

    // For security reasons, we usually say "If email exists..." but for this demo let's validate against mock data
    const user = users.find(u => u.email?.toLowerCase() === recoveryEmail.toLowerCase());

    if (user) {
        setSuccessMessage(`Seu usuário foi enviado para: ${recoveryEmail}`);
    } else {
        // Even if not found, usually good UX/Security to pretend success or be specific. 
        // For demo clarity, let's be specific or generic.
        setSuccessMessage(`Se este e-mail estiver cadastrado, você receberá seu usuário em breve.`);
    }
    
    setIsLoading(false);
  };

  const handleRecoverPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setIsLoading(true);

    await new Promise(resolve => setTimeout(resolve, 1500));

    // Allow recovery by username OR email
    const user = users.find(u => 
        u.username.toLowerCase() === recoveryUsername.toLowerCase() || 
        u.email?.toLowerCase() === recoveryUsername.toLowerCase()
    );

    if (user && user.email) {
        setSuccessMessage(`Instruções de redefinição enviadas para: ${user.email}`);
    } else {
        setSuccessMessage(`Se os dados estiverem corretos, enviamos as instruções para o seu e-mail de cadastro.`);
    }

    setIsLoading(false);
  };

  return (
    <div className="min-h-screen bg-gray-100 flex items-center justify-center p-4 bg-[url('https://images.unsplash.com/photo-1486406146926-c627a92ad1ab?q=80&w=2070&auto=format&fit=crop')] bg-cover bg-center">
      <div className="absolute inset-0 bg-slate-900/70 backdrop-blur-sm"></div>
      
      <div className="bg-white relative z-10 w-full max-w-md rounded-2xl shadow-2xl overflow-hidden transition-all duration-300">
        <div className="bg-slate-800 p-8 text-center border-b border-slate-700 relative">
          {view !== 'login' && (
             <button 
               onClick={() => switchView('login')} 
               className="absolute left-4 top-8 text-white/50 hover:text-white transition-colors"
               title="Voltar"
             >
                <ArrowLeft className="w-6 h-6" />
             </button>
          )}

          <div className="mx-auto w-12 h-12 bg-blue-600 rounded-xl flex items-center justify-center mb-4 shadow-lg shadow-blue-900/50">
             <ShieldCheck className="w-7 h-7 text-white" />
          </div>
          <h1 className="text-2xl font-bold text-white mb-2">Portal Corporativo</h1>
          <p className="text-slate-400 text-sm">Gestão de Rotas & Vendas</p>
        </div>

        <div className="p-8 space-y-6">
          
          {/* VIEW: LOGIN */}
          {view === 'login' && (
            <>
                {/* Google Sign In Section */}
                <div className="space-y-4 pb-6 border-b border-gray-100">
                    <p className="text-xs text-center text-gray-500 font-medium uppercase tracking-wide">Acesso Rápido</p>
                    <div id="googleSignInDiv" className="flex justify-center h-[40px]"></div>
                    
                    <div className="text-center pt-2">
                        <button 
                            type="button"
                            onClick={handleSimulatedLogin}
                            className="text-[10px] text-blue-500 hover:text-blue-700 underline cursor-pointer"
                        >
                            (Erro 401 "invalid_client"? Clique aqui para simular o acesso)
                        </button>
                    </div>
                </div>

                <form onSubmit={handleSubmit} className="space-y-5 pt-2 animate-fade-in">
                    <div className="relative flex items-center justify-center">
                    <span className="bg-white px-2 text-xs text-gray-400 uppercase">Ou acesso com senha</span>
                    <div className="absolute inset-0 border-t border-gray-200 -z-10"></div>
                    </div>

                    <div className="space-y-4">
                    <div>
                        <label className="block text-xs font-bold text-gray-500 uppercase tracking-wide mb-1">Usuário</label>
                        <div className="relative">
                        <User className="absolute left-3 top-2.5 h-5 w-5 text-gray-400" />
                        <input 
                            type="text"
                            value={username}
                            onChange={(e) => setUsername(e.target.value)}
                            placeholder="Digite seu usuário"
                            className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:outline-none"
                        />
                        </div>
                        <div className="text-right mt-1">
                           <button type="button" onClick={() => switchView('forgot_user')} className="text-[10px] text-blue-500 hover:text-blue-700 font-medium">
                               Esqueci o usuário
                           </button>
                        </div>
                    </div>

                    <div>
                        <label className="block text-xs font-bold text-gray-500 uppercase tracking-wide mb-1">Senha</label>
                        <div className="relative">
                        <Lock className="absolute left-3 top-2.5 h-5 w-5 text-gray-400" />
                        <input 
                            type="password"
                            value={password}
                            onChange={(e) => setPassword(e.target.value)}
                            placeholder="••••••"
                            className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:outline-none"
                        />
                        </div>
                        <div className="text-right mt-1">
                           <button type="button" onClick={() => switchView('forgot_pass')} className="text-[10px] text-blue-500 hover:text-blue-700 font-medium">
                               Esqueci a senha
                           </button>
                        </div>
                    </div>
                    </div>

                    {error && (
                    <div className="flex items-center gap-2 text-red-600 text-sm bg-red-50 p-3 rounded border border-red-100">
                        <AlertCircle className="w-4 h-4 flex-shrink-0" />
                        {error}
                    </div>
                    )}

                    <button 
                    type="submit"
                    className="w-full bg-slate-800 hover:bg-slate-900 text-white font-bold py-3 rounded-lg transition-colors flex items-center justify-center gap-2 shadow-md"
                    >
                    Entrar <ArrowRight className="w-4 h-4" />
                    </button>
                </form>
            </>
          )}

          {/* VIEW: FORGOT USERNAME */}
          {view === 'forgot_user' && (
             <div className="animate-fade-in space-y-6">
                <div className="text-center">
                    <div className="bg-blue-50 w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4">
                        <User className="w-8 h-8 text-blue-600" />
                    </div>
                    <h3 className="text-lg font-bold text-gray-800">Recuperar Usuário</h3>
                    <p className="text-sm text-gray-500 mt-2">
                        Informe seu e-mail cadastrado. Enviaremos seu nome de usuário para ele.
                    </p>
                </div>

                {!successMessage ? (
                    <form onSubmit={handleRecoverUsername} className="space-y-4">
                        <div>
                            <label className="block text-xs font-bold text-gray-500 uppercase tracking-wide mb-1">E-mail Cadastrado</label>
                            <div className="relative">
                                <Mail className="absolute left-3 top-2.5 h-5 w-5 text-gray-400" />
                                <input 
                                    type="email"
                                    required
                                    value={recoveryEmail}
                                    onChange={(e) => setRecoveryEmail(e.target.value)}
                                    placeholder="exemplo@empresa.com"
                                    className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:outline-none"
                                />
                            </div>
                        </div>

                        <button 
                            type="submit"
                            disabled={isLoading}
                            className="w-full bg-blue-600 hover:bg-blue-700 text-white font-bold py-3 rounded-lg transition-colors flex items-center justify-center gap-2 shadow-md disabled:opacity-70 disabled:cursor-wait"
                        >
                            {isLoading ? 'Enviando...' : 'Recuperar Usuário'}
                            {!isLoading && <Send className="w-4 h-4" />}
                        </button>
                    </form>
                ) : (
                    <div className="bg-green-50 border border-green-200 rounded-xl p-6 text-center animate-fade-in">
                        <Check className="w-10 h-10 text-green-500 mx-auto mb-3" />
                        <h4 className="text-green-800 font-bold mb-2">E-mail Enviado!</h4>
                        <p className="text-sm text-green-700">{successMessage}</p>
                        <button 
                            onClick={() => switchView('login')}
                            className="mt-4 text-sm font-bold text-green-700 hover:text-green-900 underline"
                        >
                            Voltar para o Login
                        </button>
                    </div>
                )}
             </div>
          )}

          {/* VIEW: FORGOT PASSWORD */}
          {view === 'forgot_pass' && (
             <div className="animate-fade-in space-y-6">
                <div className="text-center">
                    <div className="bg-orange-50 w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4">
                        <Lock className="w-8 h-8 text-orange-600" />
                    </div>
                    <h3 className="text-lg font-bold text-gray-800">Redefinir Senha</h3>
                    <p className="text-sm text-gray-500 mt-2">
                        Informe seu usuário ou e-mail. Enviaremos as instruções de redefinição.
                    </p>
                </div>

                {!successMessage ? (
                    <form onSubmit={handleRecoverPassword} className="space-y-4">
                        <div>
                            <label className="block text-xs font-bold text-gray-500 uppercase tracking-wide mb-1">Usuário ou E-mail</label>
                            <div className="relative">
                                <User className="absolute left-3 top-2.5 h-5 w-5 text-gray-400" />
                                <input 
                                    type="text"
                                    required
                                    value={recoveryUsername}
                                    onChange={(e) => setRecoveryUsername(e.target.value)}
                                    placeholder="Digite seu usuário ou email"
                                    className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:outline-none"
                                />
                            </div>
                        </div>

                        <button 
                            type="submit"
                            disabled={isLoading}
                            className="w-full bg-orange-600 hover:bg-orange-700 text-white font-bold py-3 rounded-lg transition-colors flex items-center justify-center gap-2 shadow-md disabled:opacity-70 disabled:cursor-wait"
                        >
                            {isLoading ? 'Enviando...' : 'Enviar Instruções'}
                            {!isLoading && <Send className="w-4 h-4" />}
                        </button>
                    </form>
                ) : (
                    <div className="bg-green-50 border border-green-200 rounded-xl p-6 text-center animate-fade-in">
                        <Check className="w-10 h-10 text-green-500 mx-auto mb-3" />
                        <h4 className="text-green-800 font-bold mb-2">Sucesso!</h4>
                        <p className="text-sm text-green-700">{successMessage}</p>
                        <button 
                            onClick={() => switchView('login')}
                            className="mt-4 text-sm font-bold text-green-700 hover:text-green-900 underline"
                        >
                            Voltar para o Login
                        </button>
                    </div>
                )}
             </div>
          )}

        </div>
      </div>
    </div>
  );
};

export default LoginScreen;