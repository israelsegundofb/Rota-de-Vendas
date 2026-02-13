import React, { useState, useEffect } from 'react';
import { User, Lock, ArrowRight, ShieldCheck, AlertCircle, Mail, ArrowLeft, Check, Send, Shield } from 'lucide-react';
import { AppUser } from '../types';
import { useGoogleReCaptcha } from 'react-google-recaptcha-v3';
import { migrateUsers } from '../utils/authUtils';

interface LoginScreenProps {
  users: AppUser[];
  onLogin: (user: AppUser) => void;
}

type LoginView = 'login' | 'forgot_pass';

const LoginScreen: React.FC<LoginScreenProps> = ({ users, onLogin }) => {
  const [view, setView] = useState<LoginView>('login');

  // Login Form State
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');

  // Recovery Form State
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
      // Bypassing reCAPTCHA for admin in case of initialization failure
      if (!executeRecaptcha) {
        if (username.toLowerCase() === 'admin') {
          console.warn('[CAPTCHA] reCAPTCHA not available. Admin bypass activated.');
          await finishLogin(username, password);
          return;
        }
        throw new Error('reCAPTCHA not allowed/loaded');
      }

      console.log('[CAPTCHA] Executing verification...');
      const token = await executeRecaptcha('login');

      if (!token) {
        throw new Error('reCAPTCHA token is empty');
      }

      // CAPTCHA OK - Proceder com validação de credenciais
      console.log('[AUTH] CAPTCHA passed, validating credentials...');
      await finishLogin(username, password);

    } catch (error: any) {
      console.error('[CAPTCHA] Error details:', error);

      // Se for o admin, permitimos a entrada independente do erro do reCAPTCHA
      if (username.toLowerCase() === 'admin') {
        console.warn('[CAPTCHA] Ignorando falha crítica para conta admin.');
        setError('⚠️ Modo de Emergência Ativado: Entrando sem reCAPTCHA...');

        setTimeout(async () => {
          await finishLogin(username, password);
        }, 1000);
        return;
      }

      // Mensagem para usuários comuns
      if (error?.message?.includes('not allowed') || error?.message?.includes('not initialized')) {
        setError('🔑 Erro de segurança: Domínio não autorizado ou reCAPTCHA bloqueado. Contate o suporte.');
      } else {
        setError(`🔒 Falha na verificação: ${error?.message || 'Erro de conexão'}.`);
      }
    } finally {
      setIsVerifying(false);
    }
  };

  const finishLogin = async (username: string, pass: string) => {
    // Validar credenciais usando os usuários fornecidos pelo App (Source of Truth)
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

    if (user && user.password === pass) {
      console.log('[AUTH] Login successful ✅');
      onLogin(user);
    } else {
      console.warn('[AUTH] Invalid credentials');
      setError('❌ Credenciais inválidas. Verifique usuário e senha.');
    }
  };

  // --- RECOVERY LOGIC ---

  const resetRecoveryState = () => {
    setError('');
  };

  const switchView = (newView: LoginView) => {
    resetRecoveryState();
    setView(newView);
  };

  const AUTHORIZED_ROLES = [
    'Admin Dev',
    'Admin Geral',
    'Gerente Geral',
    'Gerente de Vendas',
    'Supervisor de Vendas'
  ];

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

              <div className="flex justify-center pt-2">
                <button
                  type="button"
                  onClick={() => switchView('forgot_pass')}
                  className="text-xs text-blue-600 hover:text-blue-800 font-bold bg-blue-50 hover:bg-blue-100 px-6 py-2 rounded-full transition-all active:scale-95 shadow-sm border border-blue-100"
                >
                  Esqueci a Senha
                </button>
              </div>
            </form>
          )}

          {/* VIEW: FORGOT PASSWORD INFO */}
          {view === 'forgot_pass' && (
            <div className="animate-fade-in space-y-6">
              <div className="text-center">
                <div className="bg-orange-50 w-20 h-20 rounded-full flex items-center justify-center mx-auto mb-6 shadow-sm border border-orange-100">
                  <Lock className="w-10 h-10 text-orange-600" />
                </div>
                <h3 className="text-xl font-bold text-gray-800">Recuperação de Acesso</h3>
                <p className="text-gray-600 mt-4 leading-relaxed">
                  Solicite uma nova senha ao administrador do sistema.
                </p>
              </div>

              <div className="bg-slate-50 border border-slate-200 rounded-2xl p-6">
                <h4 className="text-xs font-bold text-slate-500 uppercase tracking-widest mb-4 flex items-center gap-2">
                  <ShieldCheck className="w-4 h-4" /> Perfis Autorizados
                </h4>
                <ul className="space-y-3">
                  {AUTHORIZED_ROLES.map((role, idx) => (
                    <li key={idx} className="flex items-center gap-3 text-sm text-slate-700 font-medium">
                      <div className="w-1.5 h-1.5 rounded-full bg-blue-500"></div>
                      {role}
                    </li>
                  ))}
                </ul>
              </div>

              <button
                onClick={() => switchView('login')}
                className="w-full bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold py-3 rounded-lg transition-colors flex items-center justify-center gap-2"
              >
                <ArrowLeft className="w-4 h-4" /> Voltar ao Login
              </button>
            </div>
          )}

        </div>
      </div>
    </div >
  );
};

export default LoginScreen;