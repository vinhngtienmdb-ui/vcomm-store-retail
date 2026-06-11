import { useMemo, useState } from "react";
import { BookOpen, ImageIcon, ChevronRight } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import { useI18n } from "@/lib/i18n-context";
import { HELP_ROLES, pickHelpText, type HelpRoleId } from "@/lib/help-content";
import { cn } from "@/lib/utils";

interface HelpGuideProps {
  initialRole?: HelpRoleId;
  restrictTo?: HelpRoleId[];
}

export function HelpGuide({ initialRole, restrictTo }: HelpGuideProps) {
  const { lang, t } = useI18n();
  const roles = useMemo(
    () => (restrictTo ? HELP_ROLES.filter((r) => restrictTo.includes(r.id)) : HELP_ROLES),
    [restrictTo],
  );
  const [activeRole, setActiveRole] = useState<HelpRoleId>(
    initialRole && roles.some((r) => r.id === initialRole)
      ? initialRole
      : roles[0]?.id ?? "customer",
  );

  const role = roles.find((r) => r.id === activeRole) ?? roles[0];
  if (!role) return null;

  return (
    <Card data-testid="card-help-guide">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <BookOpen className="w-5 h-5 text-primary" />
          {t.help.title}
        </CardTitle>
        <CardDescription>{t.help.subtitle}</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {roles.length > 1 && (
          <div className="flex flex-wrap gap-2" role="tablist" aria-label={t.help.roleSelector}>
            {roles.map((r) => {
              const active = r.id === activeRole;
              return (
                <Button
                  key={r.id}
                  type="button"
                  variant={active ? "default" : "outline"}
                  size="sm"
                  onClick={() => setActiveRole(r.id)}
                  data-testid={`button-help-role-${r.id}`}
                  aria-pressed={active}
                >
                  {pickHelpText(r.label, lang)}
                </Button>
              );
            })}
          </div>
        )}

        <p className="text-sm text-muted-foreground">{pickHelpText(role.intro, lang)}</p>

        <Accordion type="single" collapsible className="w-full">
          {role.topics.map((topic, idx) => {
            const steps = pickHelpText(topic.steps, lang);
            const title = pickHelpText(topic.title, lang);
            return (
              <AccordionItem
                key={topic.key}
                value={topic.key}
                data-testid={`accordion-help-${role.id}-${topic.key}`}
              >
                <AccordionTrigger className="text-left hover:no-underline">
                  <span className="flex items-center gap-3">
                    <span
                      className={cn(
                        "inline-flex items-center justify-center w-6 h-6 rounded-full",
                        "bg-primary/10 text-primary text-xs font-semibold shrink-0",
                      )}
                    >
                      {idx + 1}
                    </span>
                    <span className="font-medium">{title}</span>
                  </span>
                </AccordionTrigger>
                <AccordionContent>
                  <div className="grid md:grid-cols-2 gap-4 pt-2">
                    <ol className="space-y-2 list-none">
                      {steps.map((s, i) => (
                        <li key={i} className="flex gap-2 text-sm leading-relaxed">
                          <ChevronRight className="w-4 h-4 mt-0.5 text-primary shrink-0" />
                          <span>{s}</span>
                        </li>
                      ))}
                    </ol>
                    <HelpImage src={topic.image} alt={title} />
                  </div>
                </AccordionContent>
              </AccordionItem>
            );
          })}
        </Accordion>

        <p className="text-xs text-muted-foreground pt-2 border-t">{t.help.imageHint}</p>
      </CardContent>
    </Card>
  );
}

function HelpImage({ src, alt }: { src?: string; alt: string }) {
  const { t } = useI18n();
  const [failed, setFailed] = useState(false);
  if (!src || failed) {
    return (
      <div
        className="w-full aspect-[4/3] rounded-md border-2 border-dashed border-border bg-muted/30 flex flex-col items-center justify-center gap-2 text-muted-foreground"
        data-testid="help-image-placeholder"
      >
        <ImageIcon className="w-8 h-8 opacity-50" />
        <span className="text-xs px-2 text-center">{t.help.noImage}</span>
      </div>
    );
  }
  return (
    <img
      src={src}
      alt={alt}
      loading="lazy"
      onError={() => setFailed(true)}
      className="w-full aspect-[4/3] object-cover rounded-md border bg-muted"
      data-testid="help-image"
    />
  );
}
