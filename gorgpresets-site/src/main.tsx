import React from "react";
import ReactDOM from "react-dom/client";
import App from "./App";
import "./index.css";

// Link de "Esqueci minha senha" que caiu fora da área de membros (ex.: na URL
// padrão do Supabase): leva direto para a tela de nova senha, mantendo o token.
if (window.location.hash.includes("type=recovery") && !window.location.pathname.startsWith("/membros")) {
  window.location.replace(`/membros/perfil?nova-senha=1${window.location.hash}`);
}

ReactDOM.createRoot(document.getElementById("root")!).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);
