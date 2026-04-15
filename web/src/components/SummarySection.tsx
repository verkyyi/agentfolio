interface Props {
  summary: string;
}

export function SummarySection({ summary }: Props) {
  return (
    <section aria-label="Summary">
      <h2>Summary</h2>
      <p>{summary}</p>
    </section>
  );
}
