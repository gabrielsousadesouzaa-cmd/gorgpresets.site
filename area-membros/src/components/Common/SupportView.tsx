import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Mail, Send, ChevronDown, ChevronUp, Headphones, RefreshCw, CheckCircle2 } from 'lucide-react'

export const SupportView = () => {
  const [formSent, setFormSent] = useState(false);
  const [loading, setLoading] = useState(false);
  const [openFaq, setOpenFaq] = useState<number | null>(null);

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setLoading(true);
    const form = e.currentTarget;
    const name = (form.elements.namedItem('name') as HTMLInputElement).value;
    const email = (form.elements.namedItem('email') as HTMLInputElement).value;
    const message = (form.elements.namedItem('message') as HTMLTextAreaElement).value;
    await new Promise(r => setTimeout(r, 1200));
    window.location.href = `mailto:suporte@gorgpresets.com?subject=Suporte - ${name}&body=${encodeURIComponent(message + '\n\nContato: ' + email)}`;
    setLoading(false);
    setFormSent(true);
  };

  const faqs = [
    { q: 'Como faço para baixar meus presets?', a: 'Acesse a sua coleção na página Início, clique no preset desejado e depois no botão "BAIXAR AGORA".' },
    { q: 'Minha senha padrão não funciona.', a: 'A senha padrão de acesso é 1234. Se ainda não conseguir entrar, entre em contato pelo formulário ou WhatsApp.' },
    { q: 'Posso usar os presets no celular?', a: 'Sim! Nossos presets são compatíveis com a versão gratuita do Lightroom Mobile (iOS e Android).' },
    { q: 'O acesso é vitalício?', a: 'Sim, uma vez adquirido, o conteúdo e os presets são seus para sempre na área de membros.' }
  ];

  return (
    <div className="max-w-[1200px] mx-auto space-y-20 py-10 animate-in fade-in slide-in-from-bottom-4 duration-700">
      <div className="flex flex-col items-center text-center space-y-6">
         <div className="w-20 h-20 bg-black text-white rounded-[2rem] flex items-center justify-center shadow-2xl rotate-3 hover:rotate-0 transition-transform">
            <Headphones size={32} />
         </div>
         <div>
            <h2 className="text-4xl md:text-6xl font-black text-black uppercase italic tracking-tighter">Central de Apoio</h2>
            <p className="text-[10px] font-black text-gray-400 uppercase tracking-[0.4em] mt-4">Estamos aqui para garantir sua melhor edição</p>
         </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-20">
         <div className="space-y-10">
            <h3 className="text-xl font-black uppercase italic border-l-4 border-[#d82828] pl-6">Dúvidas Frequentes</h3>
            <div className="space-y-4">
               {faqs.map((faq, idx) => (
                  <div key={idx} className="bg-white border border-black/5 rounded-3xl overflow-hidden shadow-sm hover:shadow-xl transition-all">
                     <button onClick={() => setOpenFaq(openFaq === idx ? null : idx)} className="w-full p-8 flex items-center justify-between text-left">
                        <span className="font-black text-[13px] uppercase tracking-tight text-gray-800">{faq.q}</span>
                        {openFaq === idx ? <ChevronUp size={18} className="text-[#d82828]" /> : <ChevronDown size={18} className="text-gray-300" />}
                     </button>
                     <AnimatePresence>
                        {openFaq === idx && (
                           <motion.div initial={{ height: 0 }} animate={{ height: 'auto' }} exit={{ height: 0 }} className="overflow-hidden">
                              <div className="p-8 pt-0 text-gray-500 text-sm leading-relaxed border-t border-gray-50 bg-gray-50/30">
                                 {faq.a}
                              </div>
                           </motion.div>
                        )}
                     </AnimatePresence>
                  </div>
               ))}
            </div>
         </div>

         <div className="bg-white border border-black/5 p-12 rounded-[3.5rem] shadow-2xl relative overflow-hidden group">
            <div className="absolute top-0 right-0 w-64 h-64 bg-[#d82828]/5 rounded-full blur-[80px] -z-10 group-hover:bg-[#d82828]/10 transition-colors" />
            <h3 className="text-xl font-black uppercase italic mb-8 flex items-center gap-4">
               <Mail size={24} className="text-[#d82828]" /> Envie um Ticket
            </h3>
            
            {formSent ? (
               <motion.div initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} className="py-20 text-center space-y-6">
                  <div className="w-20 h-20 bg-emerald-500 text-white rounded-full flex items-center justify-center mx-auto shadow-xl shadow-emerald-500/20">
                     <CheckCircle2 size={40} />
                  </div>
                  <h4 className="text-2xl font-black uppercase italic">Mensagem Enviada!</h4>
                  <p className="text-gray-400 text-sm font-medium">Você será redirecionado para o seu e-mail para concluir o envio.</p>
                  <button onClick={() => setFormSent(false)} className="text-[10px] font-black text-[#d82828] uppercase tracking-widest border-b border-[#d82828] pb-1">Enviar outra dúvida</button>
               </motion.div>
            ) : (
               <form onSubmit={handleSubmit} className="space-y-6">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                     <div className="space-y-2">
                        <label className="text-[10px] font-black uppercase text-gray-400 tracking-widest ml-1">Nome Completo</label>
                        <input name="name" required className="w-full bg-gray-50 border border-transparent focus:bg-white focus:border-[#d82828] rounded-2xl p-5 text-black font-bold outline-none transition-all" placeholder="Como te chamamos?" />
                     </div>
                     <div className="space-y-2">
                        <label className="text-[10px] font-black uppercase text-gray-400 tracking-widest ml-1">E-mail de Cadastro</label>
                        <input name="email" type="email" required className="w-full bg-gray-50 border border-transparent focus:bg-white focus:border-[#d82828] rounded-2xl p-5 text-black font-bold outline-none transition-all" placeholder="seu@email.com" />
                     </div>
                  </div>
                  <div className="space-y-2">
                     <label className="text-[10px] font-black uppercase text-gray-400 tracking-widest ml-1">Como podemos ajudar?</label>
                     <textarea name="message" required rows={4} className="w-full bg-gray-50 border border-transparent focus:bg-white focus:border-[#d82828] rounded-2xl p-6 text-black font-bold outline-none transition-all resize-none" placeholder="Descreva sua dúvida detalhadamente..." />
                  </div>
                  <button disabled={loading} type="submit" className="w-full py-6 bg-black text-white rounded-2xl font-black text-[11px] uppercase tracking-widest hover:bg-[#d82828] transition-all flex items-center justify-center gap-4 shadow-xl active:scale-[0.98]">
                     {loading ? <RefreshCw className="animate-spin" size={18} /> : <Send size={18} />}
                     {loading ? 'PROCESSANDO...' : 'ENVIAR MENSAGEM AGORA'}
                  </button>
               </form>
            )}
         </div>
      </div>
   </div>
  )
}
