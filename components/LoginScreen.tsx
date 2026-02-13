import React, { useState, useEffect } from 'react';
import { User, Lock, ArrowRight, ShieldCheck, AlertCircle, Mail, ArrowLeft, Check, Send, Shield } from 'lucide-react';
import { AppUser } from '../types';
import { useGoogleReCaptcha } from 'react-google-recaptcha-v3';
import { migrateUsers } from '../utils/authUtils';

interface LoginScreenProps {
  users: AppUser[];
  onLogin: (user: AppUser) => void;
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

  // CAPTCHA Hook
  const { executeRecaptcha } = useGoogleReCaptcha();
  const [isVerifying, setIsVerifying] = useState(false);



  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    // Log da chave para debug (sem expor chave completa)
    const captchaKey = import.meta.env.VITE_RECAPTCHA_SITE_KEY;
    console.log('[CAPTCHA] Key configured:', captchaKey ? `${captchaKey.substring(0, 10)}...` : 'MISSING');
    console.log('[CAPTCHA] executeRecaptcha available:', !!executeRecaptcha);

    // Verificar se o reCAPTCHA está pronto
    if (!executeRecaptcha) {
      console.error('[CAPTCHA] executeRecaptcha not available - Provider may not be loaded');
      setError('⚠️ Sistema de segurança não carregado. Recarregue a página.');
      return;
    }

    setIsVerifying(true);

    try {
      console.log('[CAPTCHA] Executing reCAPTCHA verification...');

      // Executar verificação CAPTCHA
      const token = await executeRecaptcha('login');

      console.log('[CAPTCHA] Token received:', token ? 'Success ✅' : 'Failed ❌');
      console.log('[CAPTCHA] Token length:', token?.length || 0);

      if (!token) {
        throw new Error('reCAPTCHA token is empty');
      }

      // CAPTCHA OK - Proceder com validação de credenciais
      console.log('[AUTH] CAPTCHA passed, validating credentials...');

      // Validar credenciais usando os usuários fornecidos pelo App (Source of Truth)
      // Se a lista estiver vazia (race condition no modo anônimo), usamos INITIAL_USERS como última instância
      let currentUsers = users;
      if (!currentUsers || currentUsers.length === 0) {
        console.log('[AUTH] Prop users is empty, loading INITIAL_USERS as fallback');
        const { INITIAL_USERS } = await import('../hooks/useAuth');
        currentUsers = migrateUsers(INITIAL_USERS);
      }

      // Procure o usuário na lista atual (pode vir da nuvem)
      let user = currentUsers.find(u => u.username.toLowerCase() === username.toLowerCase());

      // Fallback de emergência (Hardcoded): Se for o admin e não estiver na lista da nuvem, 
      // garante que o acesso padrão Admin DEV (123) funcione.
      if (!user && username.toLowerCase() === 'admin') {
        console.log('[AUTH] Admin not found in cloud users, using hardcoded fallback');
        const { INITIAL_USERS } = await import('../hooks/useAuth');
        user = INITIAL_USERS.find(u => u.username === 'admin');
      }

      if (user && user.password === password) {
        console.log('[AUTH] Login successful ✅');
        onLogin(user);
      } else {
        console.warn('[AUTH] Invalid credentials');
        setError('❌ Credenciais inválidas. Verifique usuário e senha.');
      }
    } catch (error: any) {
      console.error('[CAPTCHA] Error details:', {
        message: error?.message,
        name: error?.name,
        stack: error?.stack,
        error: error
      });

      // Mensagem mais específica baseada no erro
      if (error?.message?.includes('Invalid site key')) {
        setError('🔑 Erro de configuração: Chave reCAPTCHA inválida. Contate o administrador.');
      } else if (error?.message?.includes('network')) {
        setError('🌐 Erro de rede. Verifique sua conexão e tente novamente.');
      } else {
        setError(`🔒 Falha na verificação de segurança: ${error?.message || 'Erro desconhecido'}. Tente novamente.`);
      }
    } finally {
      setIsVerifying(false);
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
            <form onSubmit={handleSubmit} className="space-y-6 pt-2 animate-fade-in">
              <div className="text-center pb-2">
                <p className="text-sm text-gray-500 font-medium">Acesse sua conta para continuar</p>
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
                disabled={isVerifying}
                className="w-full bg-slate-800 hover:bg-slate-900 disabled:bg-slate-400 disabled:cursor-wait text-white font-bold py-3 rounded-lg transition-colors flex items-center justify-center gap-2 shadow-md"
              >
                {isVerifying ? (
                  <>
                    <Shield className="w-4 h-4 animate-pulse" />
                    Verificando segurança...
                  </>
                ) : (
                  <>
                    Entrar <ArrowRight className="w-4 h-4" />
                  </>
                )}
              </button>
            </form>
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
    </div >
  );
};

export default LoginScreen;