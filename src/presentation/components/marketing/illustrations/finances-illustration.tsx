"use client";

import { motion } from "framer-motion";
import { useMotionPreferences } from "../use-motion-preferences";

export function FinancesIllustration() {
  const { prefersReducedMotion } = useMotionPreferences();

  const rows = [
    { name: "Lucía M.", plan: "Mensual", status: "Pagado", dot: "bg-success" },
    { name: "Gonzalo T.", plan: "Trimestral", status: "Pagado", dot: "bg-success" },
    { name: "Carmen V.", plan: "Mensual", status: "Vencido", dot: "bg-destructive" },
    { name: "Pablo R.", plan: "Mensual", status: "Pendiente", dot: "bg-warning" },
    { name: "Fernanda D.", plan: "Anual", status: "Pagado", dot: "bg-success" },
  ];

  return (
    <div
      aria-hidden="true"
      className="flex h-full min-h-[280px] flex-col gap-3 p-5 sm:p-6 lg:min-h-[360px]"
    >
      {/* Revenue pill */}
      <motion.div
        initial={prefersReducedMotion ? false : { opacity: 0, y: -8 }}
        whileInView={prefersReducedMotion ? undefined : { opacity: 1, y: 0 }}
        viewport={{ once: true }}
        transition={{ duration: 0.4 }}
        className="flex items-center justify-between rounded-xl border border-success/20 bg-success/8 px-4 py-3"
      >
        <div>
          <p className="text-xs text-muted-foreground">Ingresos este mes</p>
          <p className="metric-number text-2xl font-bold text-success">$84.500</p>
        </div>
        <div className="flex flex-col items-end gap-0.5">
          <span className="rounded-full bg-success/20 px-2 py-0.5 text-[10px] font-semibold text-success">
            +12%
          </span>
          <p className="text-[10px] text-muted-foreground">vs mes anterior</p>
        </div>
      </motion.div>

      {/* Member list */}
      <div className="flex-1 overflow-hidden rounded-xl border border-white/6 bg-card">
        <div className="border-b border-white/6 px-4 py-2.5">
          <p className="text-xs font-semibold text-muted-foreground">
            Estado de membresías
          </p>
        </div>
        <div className="flex flex-col">
          {rows.map((row, i) => (
            <motion.div
              key={row.name}
              initial={prefersReducedMotion ? false : { opacity: 0, x: -10 }}
              whileInView={prefersReducedMotion ? undefined : { opacity: 1, x: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.3, delay: 0.05 * i }}
              className="flex items-center justify-between border-b border-white/4 px-4 py-2.5 last:border-0"
            >
              <div className="flex items-center gap-2.5">
                <span className={`h-2 w-2 shrink-0 rounded-full ${row.dot}`} />
                <div>
                  <p className="text-xs font-semibold text-foreground">
                    {row.name}
                  </p>
                  <p className="text-[10px] text-muted-foreground">{row.plan}</p>
                </div>
              </div>
              <span
                className={`rounded-full px-2 py-0.5 text-[10px] font-semibold ${
                  row.status === "Pagado"
                    ? "bg-success/12 text-success"
                    : row.status === "Vencido"
                      ? "bg-destructive/12 text-destructive"
                      : "bg-warning/12 text-warning"
                }`}
              >
                {row.status}
              </span>
            </motion.div>
          ))}
        </div>
      </div>
    </div>
  );
}
