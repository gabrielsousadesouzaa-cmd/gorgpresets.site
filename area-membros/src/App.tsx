import React from 'react'

function App() {
  return (
    <div className="min-h-screen w-full flex flex-col items-center justify-center p-4 bg-[#0f172a] text-white">
      <div className="max-w-md w-full text-center space-y-8 animate-in fade-in zoom-in duration-700">
        <h1 className="text-4xl md:text-5xl font-black tracking-tight text-white mb-2">
          Área de <span className="text-rose-500">Membros</span>
        </h1>
        <p className="text-slate-400 text-lg">
          Em breve, você terá acesso a todo o conteúdo exclusivo da Gorg Presets.
        </p>
        
        <div className="p-8 rounded-3xl border border-slate-800 bg-slate-900/50 backdrop-blur-xl shadow-2xl">
          <div className="h-12 w-12 rounded-full bg-rose-500/20 flex items-center justify-center mx-auto mb-6">
            <svg className="w-6 h-6 text-rose-500" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
            </svg>
          </div>
          <p className="text-sm font-medium text-slate-300 mb-6">Estamos preparando tudo para você!</p>
          <button className="w-full py-4 bg-rose-600 hover:bg-rose-500 text-white font-bold rounded-2xl transition-all active:scale-95">
            Voltar para o Site principal
          </button>
        </div>
        
        <footer className="text-slate-500 text-sm mt-12">
          &copy; 2026 Gorg Presets. Todos os direitos reservados.
        </footer>
      </div>
    </div>
  )
}

export default App
