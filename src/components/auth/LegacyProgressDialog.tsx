import { motion } from "framer-motion";
import { Database, Download, X } from "lucide-react";

interface LegacyProgressDialogProps {
  onImport: () => void;
  onContinue: () => void;
}

export function LegacyProgressDialog({ onImport, onContinue }: LegacyProgressDialogProps) {
  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center bg-background/80 p-6 backdrop-blur-md">
      <motion.div
        initial={{ opacity: 0, scale: 0.95, y: 20 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        className="w-full max-w-sm rounded-[32px] border border-border bg-card p-8 shadow-2xl"
      >
        <div className="mx-auto mb-6 grid h-16 w-16 place-items-center rounded-2xl bg-primary/10 text-primary">
          <Database size={32} />
        </div>
        
        <h2 className="text-center font-display text-2xl leading-tight text-primary">
          Progresso encontrado
        </h2>
        
        <p className="mt-4 text-center text-[15px] leading-relaxed text-muted-foreground">
          Encontramos um progresso salvo neste dispositivo criado antes da entrada na conta. Deseja vinculá-lo à conta atual?
        </p>
        
        <div className="mt-8 space-y-3">
          <button
            onClick={onImport}
            className="w-full flex items-center justify-center gap-2 rounded-full bg-accent py-4 text-[15px] font-bold text-accent-foreground shadow-lg shadow-accent/20 transition-transform hover:bg-accent/90 active:scale-[0.98]"
          >
            <Download size={18} />
            Importar para esta conta
          </button>
          
          <button
            onClick={onContinue}
            className="w-full rounded-full border border-border py-4 text-[15px] font-semibold text-muted-foreground transition-colors hover:bg-muted hover:text-foreground active:scale-[0.98]"
          >
            Continuar sem importar
          </button>
        </div>
        
        <p className="mt-6 text-center text-[11px] uppercase tracking-widest text-muted-foreground/50">
          Esta ação é irreversível
        </p>
      </motion.div>
    </div>
  );
}
