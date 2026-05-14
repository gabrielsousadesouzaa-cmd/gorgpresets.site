import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Lock, RefreshCw, CheckCircle2, AlertCircle } from 'lucide-react'

interface LoginViewProps {
  onLogin: (e: string, p: string, r: boolean) => Promise<boolean>
  logoUrl: string
}

export const LoginView = ({ onLogin, logoUrl }: LoginViewProps) => {
  const savedEmail = localStorage.getItem('gorg_remember_email') || '';
  const [email, setEmail] = useState(savedEmail);
  const [password, setPassword] = useState('');
  const [remember, setRemember] = useState(!!savedEmail);
  const [loading, setLoading] = useState(false);
  const [showSupport, setShowSupport] = useState(false);
  const [loginError, setLoginError] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setLoginError(false);
    const success = await onLogin(email, password, remember);
    if (!success) {
      setLoading(false);
      setLoginError(true);
    } else {
      if (remember) {
        localStorage.setItem('gorg_remember_email', email);
      } else {
        localStorage.removeItem('gorg_remember_email');
      }
    }
  };

  return (
    <div className="min-h-[100dvh] w-full bg-[#f4f4f5] flex flex-col items-center justify-center p-6 font-sans relative overflow-hidden">
      <motion.div animate={{ scale: [1, 1.05, 1], rotate: [0, 90, 0] }} transition={{ duration: 15, repeat: Infinity, ease: "easeInOut" }} className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] sm:w-[800px] h-[600px] sm:h-[800px] rounded-full pointer-events-none" style={{ background: 'radial-gradient(circle, rgba(216,40,40,0.15) 0%, transparent 60%)' }} />
      
      <motion.div initial={{ opacity: 0, scale: 0.95, y: 20 }} animate={{ opacity: 1, scale: 1, y: 0 }} transition={{ duration: 0.6, ease: [0.16, 1, 0.3, 1] }} className="w-full max-w-[360px] sm:max-w-[380px] bg-white rounded-[2.5rem] sm:rounded-[3rem] p-8 sm:p-10 shadow-[0_30px_60px_rgba(0,0,0,0.08)] relative z-10 mx-auto">
        
        <div className="flex flex-col items-center mb-6 sm:mb-8 text-center">
          <motion.div initial={{ opacity: 0, scale: 0.9, y: 15 }} animate={{ opacity: 1, scale: 1, y: 0 }} transition={{ delay: 0.05, duration: 0.6, ease: [0.16, 1, 0.3, 1] }} className="w-48 sm:w-56 mb-4 sm:mb-6 flex items-center justify-center min-h-[40px]">
            {logoUrl && <img src={logoUrl} alt="" className="max-w-full h-auto object-contain drop-shadow-sm" />}
          </motion.div>
          <motion.div initial={{ opacity: 0, y: 15 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1, duration: 0.6, ease: [0.16, 1, 0.3, 1] }}>
            <h1 className="text-[20px] sm:text-[22px] font-black text-gray-900 uppercase tracking-tight">ÁREA DE MEMBROS</h1>
            <p className="text-[12px] sm:text-[13px] font-medium text-gray-400 mt-1 sm:mt-2">Identifique-se para acessar o material</p>
          </motion.div>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4 sm:space-y-5">
          <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.15, duration: 0.6, ease: [0.16, 1, 0.3, 1] }} className="space-y-2">
             <label className="text-[11px] font-black text-gray-400 uppercase tracking-widest ml-1">E-MAIL</label>
             <input 
               type="email" required value={email} onChange={(e) => { setEmail(e.target.value); setLoginError(false); }}
               className="w-full h-14 bg-gray-50 border-2 border-transparent focus:bg-white focus:border-[#d82828] focus:shadow-[0_0_0_4px_rgba(216,40,40,0.1)] rounded-xl px-5 text-gray-800 font-bold outline-none transition-all placeholder:text-gray-400" 
               placeholder="seu@email.com" 
             />
          </motion.div>
          
          <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2, duration: 0.6, ease: [0.16, 1, 0.3, 1] }} className="space-y-2">
             <label className="text-[11px] font-black text-gray-400 uppercase tracking-widest ml-1 flex justify-between">
               SENHA
             </label>
             <input 
               type="password" required value={password} onChange={(e) => { setPassword(e.target.value); setLoginError(false); }}
               className={`w-full h-14 bg-gray-50 border-2 focus:bg-white rounded-xl px-5 text-gray-800 font-bold outline-none transition-all placeholder:text-gray-300 tracking-[0.2em] ${loginError ? 'border-[#d82828] shadow-[0_0_0_4px_rgba(216,40,40,0.1)]' : 'border-transparent focus:border-[#d82828] focus:shadow-[0_0_0_4px_rgba(216,40,40,0.1)]'}`}
               placeholder="••••••••" 
             />
             <AnimatePresence>
               {loginError && (
                 <motion.p initial={{ opacity: 0, y: -4 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} className="text-[11px] text-[#d82828] font-black flex items-center gap-1.5 ml-1">
                   <AlertCircle size={12} /> E-mail ou senha inválidos.
                 </motion.p>
               )}
             </AnimatePresence>
             {!loginError && <p className="text-[11px] text-gray-400 text-center pt-1 font-medium">A sua senha padrão de acesso é <strong className="text-[#d82828] font-black">1234</strong></p>}
          </motion.div>

          <div className="flex flex-col pt-2 gap-4">
            <div className="flex items-center justify-between">
              <button type="button" onClick={() => setRemember(!remember)} className="flex items-center gap-3 group">
                 <div className={`w-5 h-5 rounded-md border-2 transition-all flex items-center justify-center ${remember ? 'bg-[#d82828] border-[#d82828]' : 'border-gray-200 bg-gray-50'}`}>
                   {remember && <CheckCircle2 size={12} className="text-white" />}
                 </div>
                 <span className="text-[11px] font-black text-gray-500 uppercase tracking-widest group-hover:text-gray-900 transition-colors">Lembrar</span>
              </button>
              <button type="button" onClick={() => setShowSupport(!showSupport)} className="text-[11px] font-black text-black uppercase tracking-widest hover:text-[#d82828] transition-colors">Precisa de ajuda?</button>
            </div>
            
            <AnimatePresence>
              {showSupport && (
                <motion.div 
                  initial={{ opacity: 0, height: 0 }} 
                  animate={{ opacity: 1, height: 'auto' }} 
                  exit={{ opacity: 0, height: 0 }} 
                  className="overflow-hidden bg-gray-50 p-4 rounded-xl border border-gray-100 flex flex-col items-center justify-center gap-2 mt-1 shadow-inner"
                >
                   <span className="text-[10px] font-black text-gray-400 uppercase tracking-widest mx-auto block text-center">E-MAIL DO SUPORTE</span>
                   <a href="mailto:suporte@gorgpresets.com" className="text-[12px] sm:text-[13px] font-black text-gray-800 tracking-[0.1em] hover:text-[#d82828] transition-colors mx-auto block text-center">
                    suporte@gorgpresets.com
                  </a>
                </motion.div>
              )}
            </AnimatePresence>
          </div>

          <button disabled={loading} type="submit" className="w-full h-14 mt-4 bg-[#d82828] text-white rounded-xl font-bold text-[13px] uppercase tracking-widest hover:bg-[#b01e1e] active:scale-[0.98] transition-all flex items-center justify-center gap-3 shadow-lg shadow-red-500/20">
            {loading ? <RefreshCw className="animate-spin w-4 h-4" /> : <Lock className="w-4 h-4" />}
            {loading ? 'VALIDANDO...' : 'ACESSAR CONTA'}
          </button>
        </form>
      </motion.div>
    </div>
  )
}
