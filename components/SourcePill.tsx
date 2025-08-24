
import React from 'react';
import { Source } from '../types';
import { LinkIcon } from './IconComponents';

interface SourcePillProps {
  source: Source;
}

const SourcePill: React.FC<SourcePillProps> = ({ source }) => (
  <a
    href={source.uri}
    target="_blank"
    rel="noopener noreferrer"
    className="inline-block bg-cyan-900/50 hover:bg-cyan-800/60 text-cyan-300 text-xs font-mono rounded-full px-3 py-1 mr-2 mb-2 transition-colors duration-200 truncate"
    title={source.uri}
  >
    <LinkIcon />
    {source.title || new URL(source.uri).hostname}
  </a>
);

export default SourcePill;
