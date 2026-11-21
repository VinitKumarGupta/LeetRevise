import { Code2 } from 'lucide-react';
import { Link } from 'react-router-dom';

export function Brand({ onClick }: { onClick?: () => void }) {
  return (
    <Link to="/dashboard" className="brand" onClick={onClick}>
      <span className="brand-mark"><Code2 aria-hidden="true" /></span>
      <span>LeetRevise</span>
    </Link>
  );
}
