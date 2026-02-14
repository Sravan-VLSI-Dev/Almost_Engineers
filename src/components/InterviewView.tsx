import { useState } from "react";
import { InterviewGuide } from "@/lib/types";
import { MessageSquare } from "lucide-react";
import { AnimatePresence, motion } from "framer-motion";

interface Props {
  guide: InterviewGuide;
}

export const InterviewView = ({ guide }: Props) => {
  const [open, setOpen] = useState<number | null>(0);

  return (
    <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} className="space-y-4">
      <div className="glass rounded-lg p-4 flex items-center gap-3">
        <MessageSquare className="h-5 w-5 text-primary" />
        <div>
          <h3 className="font-medium">Interview One-Pager</h3>
          <p className="text-sm text-muted-foreground">
            {guide.interview_guide.length} tailored questions with example answers
          </p>
        </div>
      </div>

      <div className="space-y-2">
        {guide.interview_guide.map((q, i) => (
          <div key={i} className="glass rounded-lg border border-white/60">
            <button
              type="button"
              className="w-full text-left px-4 py-3 flex items-center gap-2"
              onClick={() => setOpen(open === i ? null : i)}
            >
              <span className="font-mono text-xs text-muted-foreground">Node {i + 1}</span>
              <span className="text-sm">{q.question}</span>
            </button>
            <AnimatePresence initial={false}>
              {open === i && (
                <motion.div
                  initial={{ height: 0, opacity: 0 }}
                  animate={{ height: "auto", opacity: 1 }}
                  exit={{ height: 0, opacity: 0 }}
                  transition={{ duration: 0.25 }}
                  className="overflow-hidden px-4 pb-4 space-y-3"
                >
                  <div>
                    <h5 className="text-xs text-muted-foreground uppercase tracking-wider mb-1">Example Answer</h5>
                    <motion.p initial={{ opacity: 0, y: 4 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.06 }} className="text-sm text-foreground/90">
                      {q.example_answer}
                    </motion.p>
                  </div>
                  <div>
                    <h5 className="text-xs text-muted-foreground uppercase tracking-wider mb-1">Reasoning Trace</h5>
                    <motion.p initial={{ opacity: 0, y: 4 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }} className="text-sm text-muted-foreground">
                      {q.explanation}
                    </motion.p>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        ))}
      </div>
    </motion.div>
  );
};
