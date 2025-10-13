"use client";

import { ChevronDown } from "lucide-react";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@workspace/ui/components/collapsible";
import { AnimatePresence, motion } from "framer-motion";
import { useState } from "react";
import { useTranslations } from "next-intl";

type QA = { question: string; answer: string };

export function FAQ() {
  const t = useTranslations("FAQ");
  const faqs: QA[] = (t.raw("items") as { q: string; a: string }[]).map((it) => ({ question: it.q, answer: it.a }));
  return (
    <section className="mx-auto my-18 w-full">
      <div className="mb-8 flex flex-col items-center gap-3 text-center">
        <h2 className="text-2xl font-semibold md:text-3xl">{t("title")}</h2>
        <p className="max-w-2xl text-sm text-muted-foreground">{t("subtitle")}</p>
      </div>

      <div className="mx-auto grid max-w-3xl gap-3">
        {faqs.map((qa, index) => (
          <FAQItem key={index} qa={qa} index={index} />)
        )}
      </div>
    </section>
  );
}

function FAQItem({ qa, index }: { qa: QA; index: number }) {
  const [open, setOpen] = useState(false);

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, amount: 0.4 }}
      transition={{ duration: 0.35, delay: index * 0.05 }}
    >
      <Collapsible open={open} onOpenChange={setOpen} className="rounded-xl border bg-white p-4">
        <CollapsibleTrigger className="flex w-full items-center justify-between gap-4 text-left">
          <span className="text-base font-medium">{qa.question}</span>
          <motion.span
            animate={{ rotate: open ? 180 : 0 }}
            transition={{ duration: 0.2 }}
            className="text-muted-foreground"
          >
            <ChevronDown className="h-4 w-4" />
          </motion.span>
        </CollapsibleTrigger>
        <CollapsibleContent asChild>
          <AnimatePresence initial={false}>
            {open && (
              <motion.div
                key="content"
                initial={{ height: 0, opacity: 0 }}
                animate={{ height: "auto", opacity: 1 }}
                exit={{ height: 0, opacity: 0 }}
                transition={{ duration: 0.25, ease: "easeInOut" }}
                className="overflow-hidden"
              >
                <div className="pt-3 text-sm text-muted-foreground">{qa.answer}</div>
              </motion.div>
            )}
          </AnimatePresence>
        </CollapsibleContent>
      </Collapsible>
    </motion.div>
  );
}

export default FAQ;


