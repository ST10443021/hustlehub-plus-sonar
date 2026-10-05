import { useEffect, useState } from 'react';

export function useResource(load, dependencies) {
  const [state, setState] = useState({ loading: true, data: null, error: '' });
  const [retry, setRetry] = useState(0);
  useEffect(() => {
    let active = true;
    setState({ loading: true, data: null, error: '' });
    Promise.resolve().then(load).then(
      (data) => active && setState({ loading: false, data, error: '' }),
      (error) => active && setState({ loading: false, data: null, error: error.message || 'Please try again.' }),
    );
    return () => { active = false; };
  }, [...dependencies, retry]);
  return { ...state, retry: () => setRetry((value) => value + 1) };
}
