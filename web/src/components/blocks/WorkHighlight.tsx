import type { WorkHighlightData } from '../../blocks/types';
import './WorkHighlight.css';

export interface WorkHighlightProps { data: WorkHighlightData }

export function WorkHighlight({ data }: WorkHighlightProps) {
  return (
    <div className="block-work-highlight">
      <div className="block-work-head">
        <strong>{data.company}</strong>
        <span className="block-work-role"> · {data.role}</span>
        <span className="block-work-period">{data.period}</span>
      </div>
      {data.bullets.length > 0 && (
        <ul className="block-work-bullets">
          {data.bullets.map((b, i) => <li key={i}>{b}</li>)}
        </ul>
      )}
    </div>
  );
}
