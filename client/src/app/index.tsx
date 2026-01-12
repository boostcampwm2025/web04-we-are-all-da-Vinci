import { createBrowserRouter, RouterProvider } from 'react-router-dom';
import { routes } from '@/app/config/router';

const router = createBrowserRouter(routes);

const App = () => {
  return (
    <RouterProvider router={router} />
  );
};

export default App;
