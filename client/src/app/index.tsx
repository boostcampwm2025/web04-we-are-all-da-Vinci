import { createBrowserRouter, RouterProvider } from 'react-router-dom';
import { routes } from '@/app/config/router';
import AppLayout from '@/app/ui/appLayout';

const router = createBrowserRouter(routes);

const App = () => {
  return (
    <AppLayout>
      <RouterProvider router={router} />
    </AppLayout>
  );
};

export default App;
