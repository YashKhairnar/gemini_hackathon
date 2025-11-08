// @ts-ignore - IDE is a JSX file, not TypeScript
import IDE from '../components/IDE/IDE';
import { RepoContext } from '@automerge/react';
import { useContext } from 'react';

export function SecondPage() {
  // Get the repo from context (set in main.tsx)
  const repo = useContext(RepoContext);
  
  // Access root document handle from window (set in main.tsx)
  const rootHandle = typeof window !== 'undefined' ? window.handle : null;
  
  return <IDE repo={repo} rootHandle={rootHandle} />;
}

