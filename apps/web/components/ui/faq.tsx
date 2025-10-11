"use client";

import { ChevronDown } from "lucide-react";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@workspace/ui/components/collapsible";
import { AnimatePresence, motion } from "framer-motion";
import { useState } from "react";

type QA = { question: string; answer: string };

const faqs: QA[] = [
  {
    question: "What is Serrbi?",
    answer:
      "Serrbi is a marketplace for jobs, services, and tasks. Discover work, hire talent, and complete tasks in one place.",
  },
  {
    question: "How do filters work on listing pages?",
    answer:
      "We apply your search term from links and cards as a query parameter (e.g. ?search=Dentist) so results are prefiltered when you arrive.",
  },
  {
    question: "Can I post a job/service/task for free?",
    answer:
      "Yes. You can start on the Free plan which includes a limited number of listings. Upgrade anytime for higher limits and extra features.",
  },
  {
    question: "How does Auto‑Apply work?",
    answer:
      "Enable Auto‑Apply from your account and we’ll submit tailored applications each cycle using your preferences and uploaded resume.",
  },
];

export function FAQ() {
  return (
    <section className="mx-auto my-18 w-full">
      <div className="mb-8 flex flex-col items-center gap-3 text-center">
        <h2 className="text-2xl font-semibold md:text-3xl">Frequently asked questions</h2>
        <p className="max-w-2xl text-sm text-muted-foreground">
          Answers to common questions about using Serrbi to post, discover, and manage work.
        </p>
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


