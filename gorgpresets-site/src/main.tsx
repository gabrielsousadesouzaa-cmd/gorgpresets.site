import React from "react";
import ReactDOM from "react-dom/client";
import App from "./App";
import "./index.css";
import { isStoreHost, MEMBERS_ORIGIN, mp } from "./members/lib/paths";

// Link de "Esqueci minha senha" que caiu fora da tela de nova senha (ex.: na URL
// padrão do Supabase): leva direto para ela, mantendo o token. Na loja, vai para
// o endereço próprio da área de membros.
if (window.location.hash.includes("type=recovery") && !window.location.pathname.startsWith(mp("/perfil"))) {
  const target = `/perfil?nova-senha=1${window.location.hash}`;
  window.location.replace(isStoreHost() ? `${MEMBERS_ORIGIN}${target}` : mp(target));
}

ReactDOM.createRoot(document.getElementById("root")!).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);
