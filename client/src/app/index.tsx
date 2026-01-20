import { createBrowserRouter, RouterProvider } from 'react-router-dom';
import { routes } from '@/app/config';

const router = createBrowserRouter(routes);

const App = () => {
  return <RouterProvider router={router} />;
};

export default App;
