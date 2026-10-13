import { PageHeader } from "@/components/layout/PageHeader";
import { Card, CardBody } from "@/components/ui/Card";

interface PlaceholderPageProps {
  title: string;
  description: string;
  phase: string;
}

export function PlaceholderPage({ title, description, phase }: PlaceholderPageProps) {
  return (
    <>
      <PageHeader title={title} description={description} />
      <Card>
        <CardBody className="text-sm text-muted-foreground">
          Dieser Bereich wird in {phase} umgesetzt.
        </CardBody>
      </Card>
    </>
  );
}