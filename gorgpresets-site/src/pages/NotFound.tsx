import { Button } from "@/components/ui/button";

export default function NotFound() {
  return (
    <div className="flex flex-col items-center justify-center min-h-screen bg-background text-foreground bg-secondary/20">
      <h1 className="text-9xl font-semibold tracking-tighter mb-4 text-primary">404</h1>
      <h2 className="text-3xl font-normal mb-8">Página não encontrada</h2>
      <p className="text-muted-foreground mb-12 flex items-center max-w-sm text-center">
        Desculpe, a página que procura pode ter sido removida ou está indisponível.
      </p>
      <Button asChild size="lg" className="rounded-xl px-12 py-6 text-base shadow-md font-medium bg-primary hover:bg-primary/90 text-primary-foreground">
        <a href="/">Voltar para a Loja</a>
      </Button>
    </div>
  );
}
