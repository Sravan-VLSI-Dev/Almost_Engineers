import { InterviewGuide } from "@/lib/types";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { MessageSquare } from "lucide-react";

interface Props {
  guide: InterviewGuide;
}

export const InterviewView = ({ guide }: Props) => {
  return (
    <div className="space-y-4 animate-fade-in">
      <div className="glass rounded-lg p-4 flex items-center gap-3">
        <MessageSquare className="h-5 w-5 text-primary" />
        <div>
          <h3 className="font-medium">Interview One-Pager</h3>
          <p className="text-sm text-muted-foreground">
            {guide.interview_guide.length} tailored questions with example answers
          </p>
        </div>
      </div>

      <Accordion type="single" collapsible className="space-y-2">
        {guide.interview_guide.map((q, i) => (
          <AccordionItem key={i} value={`q-${i}`} className="glass rounded-lg border-none px-4">
            <AccordionTrigger className="text-sm text-left hover:no-underline">
              <span className="flex items-center gap-2">
                <span className="font-mono text-xs text-muted-foreground">Q{i + 1}</span>
                {q.question}
              </span>
            </AccordionTrigger>
            <AccordionContent className="space-y-3 pb-4">
              <div>
                <h5 className="text-xs text-muted-foreground uppercase tracking-wider mb-1">Example Answer</h5>
                <p className="text-sm text-foreground/90">{q.example_answer}</p>
              </div>
              <div>
                <h5 className="text-xs text-muted-foreground uppercase tracking-wider mb-1">Why This Works</h5>
                <p className="text-sm text-muted-foreground">{q.explanation}</p>
              </div>
            </AccordionContent>
          </AccordionItem>
        ))}
      </Accordion>
    </div>
  );
};
