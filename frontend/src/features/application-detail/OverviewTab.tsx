import { useState, type ReactNode } from "react";
import { Link } from "react-router-dom";
import { ExternalLink, FileText, Info, Tags, UserRound } from "lucide-react";

import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { Card, CardBody, CardHeader } from "@/components/ui/Card";
import { employmentTypeLabels, workModelLabels, type ApplicationDetail } from "@/features/applications/api";
import { cn } from "@/lib/utils";

const CLAMP_THRESHOLD = 600;

function hostname(url: string): string {
  try {
    return new URL(url).hostname.replace(/^www\./, "");
  } catch {
    return url;
  }
}

function Fact({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div className="min-w-0">
      <dt className="text-xs font-medium uppercase tracking-wide text-muted-foreground">{label}</dt>
      <dd className="mt-1 break-words text-sm">{children}</dd>
    </div>
  );
}

export function OverviewTab({ application }: { application: ApplicationDetail }) {
  const [expanded, setExpanded] = useState(false);

  const description = application.jobDescription;
  const isLong = !!description && description.length > CLAMP_THRESHOLD;
  const hasContact = !!(application.contactName || application.contactEmail || application.contactPhone);
  const workModel = application.workModel === "Unspecified" ? "–" : workModelLabels[application.workModel];
  const employmentType =
    application.employmentType === "Unspecified" ? "–" : employmentTypeLabels[application.employmentType];

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader icon={FileText} title="Stellenbeschreibung" />
        <CardBody>
          {description ? (
            <div>
              <p className={cn("whitespace-pre-wrap break-words text-sm leading-relaxed", isLong && !expanded && "line-clamp-[12]")}>
                {description}
              </p>
              {isLong ? (
                <Button variant="ghost" size="sm" className="-ml-3 mt-2" onClick={() => setExpanded((value) => !value)}>
                  {expanded ? "Weniger anzeigen" : "Mehr anzeigen"}
                </Button>
              ) : null}
            </div>
          ) : (
            <p className="text-sm text-muted-foreground">
              Keine Stellenbeschreibung hinterlegt.{" "}
              <Link to={`/bewerbungen/${application.id}/bearbeiten`} className="font-medium text-primary hover:underline">
                Ergänzen
              </Link>
            </p>
          )}
        </CardBody>
      </Card>

      <Card>
        <CardHeader icon={Info} title="Stellendetails" />
        <CardBody>
          <dl className="grid gap-4 sm:grid-cols-2">
            <Fact label="Beschäftigungsart">{employmentType}</Fact>
            <Fact label="Arbeitsmodell">{workModel}</Fact>
            <Fact label="Ort">{application.location || "–"}</Fact>
            <Fact label="Gehalt">{application.salary || "–"}</Fact>
            <Fact label="Stellenanzeige">
              {application.jobPostingUrl ? (
                <a
                  href={application.jobPostingUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1 font-medium text-primary hover:underline"
                >
                  {hostname(application.jobPostingUrl)}
                  <ExternalLink className="h-3.5 w-3.5" aria-hidden="true" />
                </a>
              ) : (
                "–"
              )}
            </Fact>
          </dl>
        </CardBody>
      </Card>

      <Card>
        <CardHeader icon={Tags} title="Technologien" />
        <CardBody>
          {application.technologies.length > 0 ? (
            <div className="flex flex-wrap gap-2">
              {application.technologies.map((technology) => (
                <Badge key={technology} tone="neutral">
                  {technology}
                </Badge>
              ))}
            </div>
          ) : (
            <p className="text-sm text-muted-foreground">Keine Technologien erfasst.</p>
          )}
        </CardBody>
      </Card>

      <Card>
        <CardHeader icon={UserRound} title="Kontakt" />
        <CardBody>
          {hasContact ? (
            <dl className="grid gap-4 sm:grid-cols-2">
              {application.contactName ? <Fact label="Name">{application.contactName}</Fact> : null}
              {application.contactEmail ? (
                <Fact label="E-Mail">
                  <a href={`mailto:${application.contactEmail}`} className="font-medium text-primary hover:underline">
                    {application.contactEmail}
                  </a>
                </Fact>
              ) : null}
              {application.contactPhone ? (
                <Fact label="Telefon">
                  <a href={`tel:${application.contactPhone}`} className="font-medium text-primary hover:underline">
                    {application.contactPhone}
                  </a>
                </Fact>
              ) : null}
            </dl>
          ) : (
            <p className="text-sm text-muted-foreground">Keine Ansprechperson erfasst.</p>
          )}
        </CardBody>
      </Card>

      {application.notes ? (
        <Card>
          <CardHeader title="Notiz" />
          <CardBody className="space-y-3">
            <p className="whitespace-pre-wrap break-words text-sm leading-relaxed">{application.notes}</p>
            <p className="text-xs text-muted-foreground">Für Verlaufsnotizen nutze den Tab Aktivität.</p>
          </CardBody>
        </Card>
      ) : null}
    </div>
  );
}
