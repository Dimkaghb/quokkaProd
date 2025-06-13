import { Routes, Route } from 'react-router-dom'
import { Landing } from '../modules/landing';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';

export const App = () => {
  const queryClient = new QueryClient();
  return(
    <QueryClientProvider client={queryClient}>
      <Routes>
        <Route path="/" element={<Landing />} />
      </Routes>
    </QueryClientProvider>
  );
}