import { Route, Switch } from 'wouter';
import { AutomergeUrl, useDocument } from '@automerge/react';
import { RootDocument } from '../rootDoc';
import { FirstPage } from '../pages/FirstPage';
import { SecondPage } from '../pages/SecondPage';

export default function App({ docUrl }: { docUrl: AutomergeUrl }) {
  // Keep the document subscription to maintain Automerge connection
  // Use suspense: false for FirstPage to avoid blocking, true for IDE pages
  useDocument<RootDocument>(docUrl, {
    suspense: false,
  });
  
  return (
    <Switch>
      <Route path="/" component={FirstPage} />
      <Route path="/home" component={SecondPage} />
    </Switch>
  );
}