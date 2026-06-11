import { useState } from "react";
import { Link } from "wouter";
import {
  Bell,
  Home,
  Smartphone,
  Apple,
  Monitor,
  Chrome,
  Globe,
  CheckCircle2,
  AlertCircle,
  Settings as SettingsIcon,
  ShieldCheck,
  HelpCircle,
  ArrowRight,
  ImageOff,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import { Badge } from "@/components/ui/badge";
import { useT } from "@/lib/i18n-context";
import { cn } from "@/lib/utils";

type Platform =
  | "androidChrome"
  | "iosSafari"
  | "windowsChrome"
  | "macSafari"
  | "macChrome";

interface PlatformDef {
  id: Platform;
  icon: typeof Smartphone;
  imageKey: string;
}

const PLATFORMS: PlatformDef[] = [
  { id: "androidChrome", icon: Smartphone, imageKey: "android-chrome" },
  { id: "iosSafari", icon: Apple, imageKey: "ios-safari" },
  { id: "windowsChrome", icon: Monitor, imageKey: "windows-chrome" },
  { id: "macSafari", icon: Apple, imageKey: "mac-safari" },
  { id: "macChrome", icon: Chrome, imageKey: "mac-chrome" },
];

function HelpImage({ src, alt }: { src: string; alt: string }) {
  const [failed, setFailed] = useState(false);
  if (failed) {
    return (
      <div className="w-full aspect-video bg-muted rounded-md border border-dashed flex flex-col items-center justify-center gap-2 text-muted-foreground text-sm">
        <ImageOff className="w-6 h-6" />
        <span className="px-4 text-center">{alt}</span>
      </div>
    );
  }
  return (
    <img
      src={src}
      alt={alt}
      onError={() => setFailed(true)}
      className="w-full rounded-md border bg-muted object-contain"
      loading="lazy"
    />
  );
}

export default function PublicNotificationHelpPage() {
  const t = useT();
  const nh = t.notifHelp;
  const base = import.meta.env.BASE_URL;

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b bg-card">
        <div className="max-w-5xl mx-auto px-4 py-4 flex items-center justify-between gap-3">
          <div className="flex items-center gap-2 min-w-0">
            <Bell className="w-5 h-5 text-primary shrink-0" />
            <h1 className="text-lg font-semibold truncate">{nh.pageTitle}</h1>
          </div>
          <Link href="/">
            <Button variant="outline" size="sm" data-testid="button-back-home">
              <Home className="w-4 h-4 mr-2" />
              {nh.backHome}
            </Button>
          </Link>
        </div>
      </header>

      <main className="max-w-5xl mx-auto px-4 py-6 space-y-6">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Bell className="w-5 h-5 text-primary" />
              {nh.intro.title}
            </CardTitle>
            <CardDescription>{nh.pageSubtitle}</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3 text-sm text-muted-foreground leading-relaxed">
            <p>{nh.intro.body}</p>
            <div className="grid sm:grid-cols-2 gap-3 pt-2">
              <div className="rounded-md border bg-muted/30 p-3 flex gap-3">
                <ShieldCheck className="w-5 h-5 text-primary shrink-0 mt-0.5" />
                <div>
                  <div className="font-medium text-foreground">{nh.whyEnable.title}</div>
                  <ul className="list-disc list-inside mt-1 space-y-0.5">
                    {nh.whyEnable.points.map((p, i) => (
                      <li key={i}>{p}</li>
                    ))}
                  </ul>
                </div>
              </div>
              <div className="rounded-md border bg-muted/30 p-3 flex gap-3">
                <HelpCircle className="w-5 h-5 text-primary shrink-0 mt-0.5" />
                <div>
                  <div className="font-medium text-foreground">{nh.whoCanEnable.title}</div>
                  <p className="mt-1">{nh.whoCanEnable.body}</p>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <SettingsIcon className="w-5 h-5 text-primary" />
              {nh.generalSteps.title}
            </CardTitle>
            <CardDescription>{nh.generalSteps.subtitle}</CardDescription>
          </CardHeader>
          <CardContent>
            <ol className="space-y-3">
              {nh.generalSteps.steps.map((s, i) => (
                <li key={i} className="flex gap-3">
                  <span className="shrink-0 w-7 h-7 rounded-full bg-primary text-primary-foreground text-sm font-semibold flex items-center justify-center">
                    {i + 1}
                  </span>
                  <span className="pt-0.5 text-sm leading-relaxed">{s}</span>
                </li>
              ))}
            </ol>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Globe className="w-5 h-5 text-primary" />
              {nh.platforms.title}
            </CardTitle>
            <CardDescription>{nh.platforms.subtitle}</CardDescription>
          </CardHeader>
          <CardContent>
            <Accordion type="single" collapsible defaultValue="androidChrome" className="w-full">
              {PLATFORMS.map((p) => {
                const data = nh.platforms[p.id];
                const Icon = p.icon;
                return (
                  <AccordionItem value={p.id} key={p.id}>
                    <AccordionTrigger className="hover:no-underline">
                      <span className="flex items-center gap-2 text-left">
                        <Icon className="w-5 h-5 text-primary" />
                        <span className="font-medium">{data.title}</span>
                        <Badge variant="secondary" className="ml-2 text-xs">
                          {data.badge}
                        </Badge>
                      </span>
                    </AccordionTrigger>
                    <AccordionContent>
                      <div className="grid md:grid-cols-2 gap-4 pt-2">
                        <div className="space-y-3">
                          <div>
                            <div className="text-xs font-semibold uppercase text-muted-foreground mb-2">
                              {nh.labels.steps}
                            </div>
                            <ol className="space-y-2">
                              {data.steps.map((s, i) => (
                                <li key={i} className="flex gap-2 text-sm">
                                  <span className="shrink-0 w-5 h-5 rounded-full bg-primary/10 text-primary text-xs font-semibold flex items-center justify-center mt-0.5">
                                    {i + 1}
                                  </span>
                                  <span>{s}</span>
                                </li>
                              ))}
                            </ol>
                          </div>
                          {data.tips.length > 0 && (
                            <div className="rounded-md bg-amber-500/10 border border-amber-500/30 p-3">
                              <div className="text-xs font-semibold uppercase text-amber-700 dark:text-amber-400 mb-1 flex items-center gap-1">
                                <AlertCircle className="w-3.5 h-3.5" />
                                {nh.labels.tips}
                              </div>
                              <ul className="list-disc list-inside text-sm space-y-1">
                                {data.tips.map((tip, i) => (
                                  <li key={i}>{tip}</li>
                                ))}
                              </ul>
                            </div>
                          )}
                          {data.troubleshoot.length > 0 && (
                            <div className="rounded-md bg-muted/50 border p-3">
                              <div className="text-xs font-semibold uppercase text-muted-foreground mb-1">
                                {nh.labels.troubleshoot}
                              </div>
                              <ul className="list-disc list-inside text-sm space-y-1 text-muted-foreground">
                                {data.troubleshoot.map((tr, i) => (
                                  <li key={i}>{tr}</li>
                                ))}
                              </ul>
                            </div>
                          )}
                        </div>
                        <div className="space-y-2">
                          <HelpImage
                            src={`${base}help-images/notifications/${p.imageKey}.png`}
                            alt={data.title}
                          />
                          <p className="text-xs text-muted-foreground italic">
                            {nh.labels.imageHint}
                          </p>
                        </div>
                      </div>
                    </AccordionContent>
                  </AccordionItem>
                );
              })}
            </Accordion>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <CheckCircle2 className="w-5 h-5 text-primary" />
              {nh.testStep.title}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <ol className="space-y-2">
              {nh.testStep.steps.map((s, i) => (
                <li key={i} className="flex gap-2 text-sm leading-relaxed">
                  <span className="shrink-0 w-5 h-5 rounded-full bg-primary/10 text-primary text-xs font-semibold flex items-center justify-center mt-0.5">
                    {i + 1}
                  </span>
                  <span>{s}</span>
                </li>
              ))}
            </ol>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <HelpCircle className="w-5 h-5 text-primary" />
              {nh.faq.title}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <Accordion type="single" collapsible className="w-full">
              {nh.faq.items.map((item, i) => (
                <AccordionItem value={`q-${i}`} key={i}>
                  <AccordionTrigger className="hover:no-underline text-left">
                    {item.q}
                  </AccordionTrigger>
                  <AccordionContent className="text-sm text-muted-foreground leading-relaxed">
                    {item.a}
                  </AccordionContent>
                </AccordionItem>
              ))}
            </Accordion>
          </CardContent>
        </Card>

        <div className={cn("flex flex-col sm:flex-row gap-3 justify-center pt-2 pb-8")}>
          <Link href="/">
            <Button variant="outline" className="w-full sm:w-auto" data-testid="button-back-home-bottom">
              <Home className="w-4 h-4 mr-2" />
              {nh.backHome}
            </Button>
          </Link>
          <Link href="/login">
            <Button className="w-full sm:w-auto" data-testid="button-open-app">
              {nh.openApp}
              <ArrowRight className="w-4 h-4 ml-2" />
            </Button>
          </Link>
        </div>
      </main>
    </div>
  );
}
