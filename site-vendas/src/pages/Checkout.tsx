import { useState, useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { useCart } from "@/store/cartStore";
import { useCurrency } from "@/store/currencyStore";
import { useLanguage } from "@/store/languageStore";
import { useProducts } from "@/hooks/useProducts";
import {
  ChevronUp, ChevronDown, User, Mail, Phone, Lock,
  ShieldCheck, CreditCard, Tag, Copy, CheckCircle2,
  AlertCircle, Loader2, RefreshCw
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { createPixTransaction, getPixStatus } from "@/services/buckpay";

import { createGGCheckoutSession } from "@/services/ggcheckout";
import { useSiteSettings } from "@/hooks/useSiteSettings";
import { toast } from "sonner";

// ─── Types ──────────────────────────────────────────────────────
type CheckoutStep = "form" | "pix_pending" | "success";

// ─── Component ──────────────────────────────────────────────────
export default function Checkout() {
  const { items, getTotal, getPromoDiscount } = useCart();
  const { formatCurrency, currency, setCurrency } = useCurrency();
  const { language, setLanguage, t } = useLanguage();
  const { products } = useProducts();
  const { settings } = useSiteSettings();
  const navigate = useNavigate();

  // UI state
  const [step, setStep] = useState<CheckoutStep>("form");
  const [isOrderOpen, setIsOrderOpen] = useState(true);
  const [paymentMethod, setPaymentMethod] = useState<"pix" | "card">("pix");
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  // PIX data
  const [pixCode, setPixCode] = useState<string | null>(null);
  const [pixQrBase64, setPixQrBase64] = useState<string | null>(null);
  const [externalId, setExternalId] = useState<string | null>(null);
  const [pollingStatus, setPollingStatus] = useState<"checking" | "paid" | "idle">("idle");
  const pollingRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // Form
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [cpf, setCpf] = useState("");
  const [phoneCode, setPhoneCode] = useState("+55");
  const [phone, setPhone] = useState("");
  const [coupon, setCoupon] = useState("");

  // Redirect if cart empty
  useEffect(() => {
    if (items.length === 0) navigate("/");
  }, [items, navigate]);

  // ── Polling: verifica status a cada 5s quando PIX está pendente ──
  useEffect(() => {
    if (step === "pix_pending" && externalId) {
      setPollingStatus("checking");
      pollingRef.current = setInterval(async () => {
        const res = await getPixStatus(externalId);
        if (res.success && res.status === "paid") {
          clearInterval(pollingRef.current!);
          setPollingStatus("paid");
          setStep("success");
        }
      }, 5000);
    }
    return () => {
      if (pollingRef.current) clearInterval(pollingRef.current);
    };
  }, [step, externalId]);

  if (items.length === 0) return null;

  // Order bumps
  const orderBumps = products
    .filter(p => !items.some(i => i.product.id === p.id))
    .slice(0, 2);

  const pixDiscount = paymentMethod === "pix" ? getTotal() * 0.05 : 0;
  const finalTotal = parseFloat((getTotal() - pixDiscount).toFixed(2));
  const amountCents = Math.round(finalTotal * 100);

  // ── Validation ────────────────────────────────────────────────
  function validate(): string | null {
    if (!name.trim() || name.trim().split(" ").length < 2)
      return "Informe seu nome e sobrenome completos.";
    if (!email.trim() || !email.includes("@"))
      return "Informe um e-mail válido.";
    return null;
  }

  // ── Submit ────────────────────────────────────────────────────
  async function handlePayment() {
    const err = validate();
    if (err) { setError(err); return; }
    setError(null);
    setIsLoading(true);

    try {
      const activeGateway = settings.integration.gateway;

      const cleanPhone = phone.trim()
        ? `${phoneCode.replace("+", "")}${phone.replace(/\D/g, "")}`
        : undefined;

      const cleanCpf = cpf.replace(/\D/g, "") || undefined;

      let result;

      // Lógica Híbrida Inteligente
      if (activeGateway === 'ggcheckout') {
        if (paymentMethod === 'pix') {
          // Para PIX, usamos a BuckPay direta para manter o checkout 100% transparente (no seu design)
          result = await createPixTransaction({
            name: name.trim(),
            email: email.trim(),
            document: cleanCpf,
            phone: cleanPhone,
            amount: amountCents,
          });
          
          if (result.success && result.pix) {
            setPixCode(result.pix.code);
            setPixQrBase64(result.pix.qrcode_base64);
            setExternalId(result.external_id ?? null);
            setStep("pix_pending");
            setIsLoading(false);
            return;
          } else {
            const msg = result.error ?? "Erro ao gerar PIX. Tente novamente.";
            setError(msg);
            toast.error(msg);
            setIsLoading(false);
            return;
          }
        } else {
          // Para CARTÃO, usamos o redirecionamento da GGCheckout (onde está o seu Stripe)
          toast.loading("Redirecionando para o pagamento seguro...");
          const checkoutUrl = settings.integration.checkoutBaseUrl;
          
          if (!checkoutUrl) {
            toast.error("Configure a URL do checkout no Admin para usar o Cartão.");
            setIsLoading(false);
            return;
          }

          setTimeout(() => {
            window.location.href = checkoutUrl;
          }, 1000);
          return;
        }
      }

      // Default: BuckPay
      result = await createPixTransaction({
        name: name.trim(),
        email: email.trim(),
        document: cleanCpf,
        phone: cleanPhone,
        amount: amountCents,
      });

      if (!result.success || !result.pix) {
        const msg = result.error ?? "Erro ao gerar PIX. Tente novamente.";
        setError(msg);
        toast.error(msg);
        return;
      }

      setPixCode(result.pix.code);
      setPixQrBase64(result.pix.qrcode_base64);
      setExternalId(result.external_id ?? null);
      setStep("pix_pending");
    } catch (e) {
      const msg = "Falha de conexão. Verifique sua internet.";
      setError(msg);
      toast.error(msg);
    } finally {
      setIsLoading(false);
    }
  }

  // ── Copy PIX ─────────────────────────────────────────────────
  function handleCopyPix() {
    if (!pixCode) return;
    navigator.clipboard.writeText(pixCode).then(() => {
      setCopied(true);
      toast.success("Código PIX copiado!");
      setTimeout(() => setCopied(false), 3000);
    });
  }

  // ═══════════════════════════════════════════════════════════════
  // TELA DE SUCESSO
  // ═══════════════════════════════════════════════════════════════
  if (step === "success") {
    return (
      <div className="min-h-screen bg-[#f4f5f5] flex items-center justify-center px-4 font-sans">
        <motion.div
          initial={{ scale: 0.9, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          className="max-w-md w-full bg-white rounded-2xl shadow-sm border border-gray-100 p-10 text-center"
        >
          <motion.div
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            transition={{ type: "spring", delay: 0.2 }}
            className="w-20 h-20 rounded-full bg-green-50 flex items-center justify-center mx-auto mb-6"
          >
            <CheckCircle2 size={40} className="text-green-500" />
          </motion.div>
          <h2 className="font-black text-2xl mb-2 tracking-tight">Pagamento confirmado!</h2>
          <p className="text-gray-500 text-[14px] mb-8 leading-relaxed">
            O seu PIX foi identificado. Você receberá o acesso aos presets no e-mail <strong>{email}</strong> em até 5 minutos.
          </p>
          <button
            onClick={() => navigate("/")}
            className="w-full bg-black text-white rounded-xl py-4 font-bold text-[14px] hover:bg-gray-800 transition-colors"
          >
            Voltar à loja
          </button>
        </motion.div>
      </div>
    );
  }

  // ═══════════════════════════════════════════════════════════════
  // TELA DE PIX GERADO (QR CODE)
  // ═══════════════════════════════════════════════════════════════
  if (step === "pix_pending") {
    return (
      <div className="min-h-screen bg-[#f4f5f5] pb-20 pt-8 px-4 font-sans text-gray-800 flex items-start justify-center">
        <div className="max-w-md mx-auto w-full space-y-5 mt-4">
          <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-7">
            {/* Header */}
            <div className="text-center mb-6">
              <div className="w-14 h-14 rounded-full bg-green-50 flex items-center justify-center mx-auto mb-4">
                <CheckCircle2 size={28} className="text-green-600" />
              </div>
              <h2 className="font-bold text-[18px] mb-1">PIX Gerado com Sucesso!</h2>
              <p className="text-gray-500 text-[13px]">
                Escaneie o QR Code ou copie o código para pagar
              </p>
            </div>

            {/* Total */}
            <div className="text-center bg-gray-50 rounded-xl py-3 px-4 mb-6">
              <span className="text-[12px] text-gray-500 font-medium">Valor a pagar</span>
              <p className="font-black text-[28px] text-[#db2727] tracking-tight">{formatCurrency(finalTotal)}</p>
            </div>

            {/* QR Code */}
            {pixQrBase64 && (
              <div className="flex justify-center mb-5">
                <div className="border-4 border-black rounded-2xl p-2 inline-block">
                  <img
                    src={pixQrBase64.startsWith("data:")
                      ? pixQrBase64
                      : `data:image/png;base64,${pixQrBase64}`}
                    alt="QR Code PIX"
                    className="w-48 h-48 rounded-lg"
                  />
                </div>
              </div>
            )}

            {/* Copia e Cola */}
            {pixCode && (
              <div className="bg-gray-50 border border-gray-200 rounded-xl p-4 mb-5">
                <p className="text-[10px] font-bold text-gray-500 mb-2 uppercase tracking-widest">
                  Código PIX — Copia e Cola
                </p>
                <p className="text-[11px] text-gray-700 break-all font-mono leading-5 select-all">
                  {pixCode}
                </p>
                <button
                  onClick={handleCopyPix}
                  className={`mt-3 w-full py-3 rounded-xl font-bold text-[13px] flex items-center justify-center gap-2 transition-all active:scale-95 ${
                    copied
                      ? "bg-green-600 text-white"
                      : "bg-[#db2727] text-white hover:bg-red-700"
                  }`}
                >
                  {copied
                    ? <><CheckCircle2 size={15}/> Copiado!</>
                    : <><Copy size={15}/> Copiar código PIX</>
                  }
                </button>
              </div>
            )}

            {/* Status de polling */}
            <div className={`flex items-center justify-center gap-2 text-[12px] font-medium rounded-xl py-3 ${
              pollingStatus === "checking" ? "bg-blue-50 text-blue-600" : "bg-gray-50 text-gray-500"
            }`}>
              <RefreshCw size={13} className={pollingStatus === "checking" ? "animate-spin" : ""} />
              {pollingStatus === "checking"
                ? "Aguardando confirmação do pagamento..."
                : "Verificando status do pagamento..."}
            </div>

            <p className="text-center text-[11px] text-gray-400 mt-4">
              O acesso será liberado automaticamente após o pagamento
            </p>
          </div>

          <div className="text-center">
            <button
              onClick={() => { setStep("form"); setPixCode(null); setPixQrBase64(null); }}
              className="text-[12px] text-gray-400 underline underline-offset-2 hover:text-black"
            >
              Voltar e alterar dados
            </button>
          </div>
        </div>
      </div>
    );
  }

  // ═══════════════════════════════════════════════════════════════
  // FORMULÁRIO PRINCIPAL
  // ═══════════════════════════════════════════════════════════════
  return (
    <div className="min-h-screen bg-[#f4f5f5] pb-20 pt-8 px-4 font-sans text-gray-800">
      <div className="max-w-xl mx-auto space-y-6">

        {/* ── RESUMO DO PEDIDO ──────────────────────────────────── */}
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
          <button
            onClick={() => setIsOrderOpen(!isOrderOpen)}
            className="w-full px-6 py-5 flex items-center justify-between font-bold text-[15px]"
          >
            {t("chkSummary")}
            {isOrderOpen
              ? <ChevronUp size={20} className="text-gray-400" />
              : <ChevronDown size={20} className="text-gray-400" />}
          </button>

          <AnimatePresence>
            {isOrderOpen && (
              <motion.div
                initial={{ height: 0, opacity: 0 }}
                animate={{ height: "auto", opacity: 1 }}
                exit={{ height: 0, opacity: 0 }}
                className="overflow-hidden"
              >
                <div className="px-5 pb-5 space-y-4">
                  {items.map((item, idx) => (
                    <div key={idx} className="flex gap-4 p-3 rounded-xl bg-gray-50 border border-gray-100 items-center">
                      <div className="w-14 h-14 rounded-lg overflow-hidden shrink-0 border border-gray-200">
                        <img src={item.product.image} alt={item.product.name} className="w-full h-full object-cover" />
                      </div>
                      <div className="flex-1">
                        <h4 className="font-bold text-[13px] uppercase tracking-tight">{item.product.name}</h4>
                        <div className="flex items-center gap-2 mt-1">
                          {item.product.originalPrice && (
                            <span className="text-[11px] text-gray-400 line-through">
                              {formatCurrency(item.product.originalPrice)}
                            </span>
                          )}
                          <span className="font-bold text-[14px] text-[#db2727]">
                            {item.isFree ? t("free") : formatCurrency(item.product.price)}
                          </span>
                        </div>
                      </div>
                    </div>
                  ))}

                  {/* Desconto PIX */}
                  {paymentMethod === "pix" && pixDiscount > 0 && (
                    <div className="flex justify-between items-center text-[13px] font-medium text-green-600 px-1 pt-2 border-t border-gray-100">
                      <span>{t("chkPixDisc")}</span>
                      <span>- {formatCurrency(pixDiscount)}</span>
                    </div>
                  )}

                  {/* Total */}
                  <div className="flex justify-between items-center px-1 pt-2 border-t border-gray-100">
                    <span className="font-bold text-[13px] text-gray-700">{t("total")}</span>
                    <span className="font-black text-[18px] text-black">{formatCurrency(finalTotal)}</span>
                  </div>

                  {/* Cupom */}
                  <div className="border border-red-200 rounded-xl p-4 border-dashed bg-red-50/30">
                    <div className="flex items-center gap-2 text-red-500 font-bold text-[13px] mb-3">
                      <Tag size={14} />
                      {t("chkCouponLabel")}
                    </div>
                    <div className="flex gap-2">
                      <input
                        type="text"
                        placeholder={t("chkCouponPlace")}
                        value={coupon}
                        onChange={e => setCoupon(e.target.value)}
                        className="flex-1 border border-gray-200 rounded-lg px-4 py-2.5 text-[14px] focus:outline-none focus:border-red-400"
                      />
                      <button className="bg-red-400 text-white font-bold text-[13px] px-6 rounded-lg hover:bg-red-500 transition-colors">
                        {t("chkApplyBtn")}
                      </button>
                    </div>
                  </div>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {/* ── IDENTIFICAÇÃO + BUMPS + PAGAMENTO ────────────────── */}
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-5 md:p-7">

          {/* Cabeçalho com seletores */}
          <div className="flex items-center justify-between mb-5">
            <h3 className="font-bold text-[16px] flex items-center gap-2">
              <User size={18} className="text-gray-500" />
              {t("chkIdentification")}
            </h3>
            <div className="flex gap-2">
              <div className="relative">
                <select
                  value={currency}
                  onChange={e => setCurrency(e.target.value as any)}
                  className="appearance-none text-[11px] font-bold border border-gray-200 pl-2 pr-5 py-1 rounded bg-white text-gray-600 focus:outline-none cursor-pointer"
                >
                  <option value="BRL">BRL</option>
                  <option value="USD">USD</option>
                  <option value="EUR">EUR</option>
                </select>
                <div className="pointer-events-none absolute inset-y-0 right-1 flex items-center text-gray-500 text-[10px]">▼</div>
              </div>
              <div className="relative">
                <select
                  value={language}
                  onChange={e => setLanguage(e.target.value as any)}
                  className="appearance-none text-[11px] font-bold border border-gray-200 pl-2 pr-5 py-1 rounded bg-white text-gray-600 focus:outline-none cursor-pointer"
                >
                  <option value="PT">PT</option>
                  <option value="EN">EN</option>
                  <option value="ES">ES</option>
                </select>
                <div className="pointer-events-none absolute inset-y-0 right-1 flex items-center text-gray-500 text-[10px]">▼</div>
              </div>
            </div>
          </div>

          {/* Campos do formulário */}
          <div className="space-y-3 mb-7">
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                <User size={16} className="text-gray-400" />
              </div>
              <input
                type="text"
                placeholder={t("chkFullName")}
                value={name}
                onChange={e => setName(e.target.value)}
                className="w-full border border-gray-200 rounded-xl py-3.5 pl-11 pr-4 text-[14px] focus:outline-none focus:border-gray-400 transition-colors"
              />
            </div>

            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                <Mail size={16} className="text-gray-400" />
              </div>
              <input
                type="email"
                placeholder={t("chkEmailLab")}
                value={email}
                onChange={e => setEmail(e.target.value)}
                className="w-full border border-gray-200 rounded-xl py-3.5 pl-11 pr-4 text-[14px] focus:outline-none focus:border-gray-400 transition-colors"
              />
            </div>

            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                <ShieldCheck size={16} className="text-gray-400" />
              </div>
              <input
                type="text"
                placeholder="CPF (opcional)"
                value={cpf}
                maxLength={14}
                onChange={e => {
                  const v = e.target.value.replace(/\D/g, "").slice(0, 11);
                  const fmt = v
                    .replace(/^(\d{3})(\d)/, "$1.$2")
                    .replace(/^(\d{3})\.(\d{3})(\d)/, "$1.$2.$3")
                    .replace(/\.(\d{3})(\d)/, ".$1-$2");
                  setCpf(fmt);
                }}
                className="w-full border border-gray-200 rounded-xl py-3.5 pl-11 pr-4 text-[14px] focus:outline-none focus:border-gray-400 transition-colors"
              />
            </div>

            <div className="flex gap-3">
              <div className="w-[100px] shrink-0 border border-gray-200 rounded-xl flex items-center px-3 gap-2 bg-white">
                <span className="text-xl leading-none">
                  {phoneCode === "+55" ? "🇧🇷" : phoneCode === "+1" ? "🇺🇸" : phoneCode === "+351" ? "🇵🇹" : phoneCode === "+44" ? "🇬🇧" : "🌍"}
                </span>
                <select
                  value={phoneCode}
                  onChange={e => setPhoneCode(e.target.value)}
                  className="bg-transparent text-[13px] font-medium outline-none w-full appearance-none cursor-pointer"
                >
                  <option value="+55">+55</option>
                  <option value="+1">+1</option>
                  <option value="+351">+351</option>
                  <option value="+44">+44</option>
                  <option value="+34">+34</option>
                  <option value="+33">+33</option>
                  <option value="+49">+49</option>
                </select>
              </div>
              <div className="flex-1 relative">
                <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                  <Phone size={16} className="text-gray-400" />
                </div>
                <input
                  type="tel"
                  placeholder={t("chkPhoneLab")}
                  value={phone}
                  onChange={e => setPhone(e.target.value)}
                  className="w-full border border-gray-200 rounded-xl py-3.5 pl-11 pr-4 text-[14px] focus:outline-none focus:border-gray-400 transition-colors"
                />
              </div>
            </div>
          </div>

          {/* ── Order Bumps ──────────────────────────────────────── */}
          {orderBumps.length > 0 && (
            <div className="mb-7">
              <h4 className="text-center text-red-600 font-bold text-[14px] mb-4">{t("chkOfferTitle")}</h4>
              <div className="space-y-3">
                {orderBumps.map((bump, idx) => (
                  <label key={idx} className="border border-gray-200 rounded-xl p-4 flex gap-3 items-center cursor-pointer hover:border-red-300 transition-colors">
                    <input type="checkbox" className="w-5 h-5 rounded border-gray-300 accent-red-500 shrink-0" />
                    <div className="w-12 h-12 rounded-lg overflow-hidden shrink-0">
                      <img src={bump.image} alt="" className="w-full h-full object-cover" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <h5 className="font-bold text-[12px] uppercase">{bump.name}</h5>
                      <p className="text-[10px] text-gray-500 truncate mt-0.5">{t("chkOfferDesc")}</p>
                      <div className="flex items-center gap-2 mt-1">
                        {bump.originalPrice && (
                          <span className="text-[10px] text-gray-400 line-through">{formatCurrency(bump.originalPrice)}</span>
                        )}
                        <span className="font-bold text-[12px] text-red-600">{formatCurrency(bump.price)}</span>
                      </div>
                    </div>
                  </label>
                ))}
              </div>
            </div>
          )}

          {/* ── Forma de Pagamento ────────────────────────────────── */}
          <div>
            <h3 className="font-bold text-[16px] flex items-center gap-2 mb-4">
              <CreditCard size={18} className="text-gray-500" />
              {t("chkPaymentMethod")}
            </h3>

            <div className="grid grid-cols-2 gap-3 mb-5 mt-2">
              <button
                onClick={() => setPaymentMethod("pix")}
                className={`relative py-4 rounded-xl font-bold text-[13px] flex flex-col items-center justify-center border-2 transition-all ${paymentMethod === "pix"
                  ? "border-[#db2727] text-[#db2727] bg-red-50/20"
                  : "border-gray-200 text-gray-500 hover:border-gray-300"}`}
              >
                <span>$$ PIX</span>
                {paymentMethod === "pix" && (
                  <span className="absolute -bottom-2.5 bg-[#db2727] text-white text-[10px] px-2 py-0.5 rounded-full z-10 font-bold shadow-sm">
                    5% OFF
                  </span>
                )}
              </button>

              <button
                onClick={() => setPaymentMethod("card")}
                className={`py-4 rounded-xl font-bold text-[13px] flex items-center justify-center gap-2 border-2 transition-all ${paymentMethod === "card"
                  ? "border-[#db2727] text-[#db2727] bg-red-50/20"
                  : "border-gray-200 text-gray-500 hover:border-gray-300"}`}
              >
                <CreditCard size={15} /> {t("chkCard")}
              </button>
            </div>

            {/* Detalhes */}
            <div className="bg-gray-50 rounded-xl p-5 mb-5 mt-4 text-[13px] text-gray-600 space-y-2">
              {paymentMethod === "pix" ? (
                <>
                  <p className="font-bold text-black text-[14px]">{t("chkPixOnlySight")}</p>
                  <p>{t("chkPixRelease")}</p>
                  <p>{t("chkPixExpiration")}</p>
                  <div className="pt-2 border-t border-gray-200 mt-3 flex justify-between items-center">
                    <span className="font-medium">{t("chkPixOnlySight")}</span>
                    <span className="font-black text-[#db2727] text-[16px]">{formatCurrency(finalTotal)}</span>
                  </div>
                </>
              ) : (
                <>
                  <p className="font-bold text-black text-[14px]">{t("chkCard")}</p>
                  <p>{t("chkCardDetail")}</p>
                  <div className="pt-2 border-t border-gray-200 mt-3 flex justify-between items-center">
                    <span className="font-medium">{t("chkTermTotal")}</span>
                    <span className="font-black text-black text-[16px]">{formatCurrency(getTotal())}</span>
                  </div>
                </>
              )}
            </div>

            {/* Erro */}
            {error && (
              <div className="flex items-center gap-2 text-red-600 bg-red-50 border border-red-200 rounded-xl px-4 py-3 mb-4 text-[13px]">
                <AlertCircle size={16} className="shrink-0" />
                {error}
              </div>
            )}

            {/* Botão */}
            <button
              onClick={handlePayment}
              disabled={isLoading}
              className="w-full bg-[#db2727] text-white rounded-xl py-4 font-bold text-[15px] flex items-center justify-center gap-2 hover:bg-red-700 transition-colors shadow-[0_4px_14px_0_rgba(219,39,39,0.39)] disabled:opacity-60 active:scale-[0.98]"
            >
              {isLoading
                ? <><Loader2 size={18} className="animate-spin" /> {t("chkProcessing")}</>
                : paymentMethod === "pix"
                  ? t("chkGenPixBtn")
                  : t("chkContinueBtn")
              }
            </button>
          </div>
        </div>

        {/* ── Footer ───────────────────────────────────────────── */}
        <div className="text-center text-[12px] text-gray-500 mb-6 font-medium space-y-3">
          <div className="flex items-center justify-center gap-1.5 text-green-600 font-bold">
            <Lock size={13} /> {t("pdSecurePayment")}
          </div>
          <div className="flex flex-wrap items-center justify-center gap-4 gap-y-2">
            <span className="flex items-center gap-1"><ShieldCheck size={13} /> {t("pdSecurePayment")}</span>
            <span className="flex items-center gap-1"><Lock size={13} /> Site protegido</span>
            <span className="flex items-center gap-1"><CreditCard size={13} /> {t("chkPaymentMethod")}</span>
          </div>
          <p className="max-w-[400px] mx-auto text-[11px] leading-relaxed opacity-70">
            {t("chkSafePage")}
          </p>
          <p className="text-[11px] opacity-60">
            © 2026 BuckPay. {t("chkAllRights")}
          </p>
        </div>
      </div>
    </div>
  );
}
