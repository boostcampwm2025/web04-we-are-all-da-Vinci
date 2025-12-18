import { createBrowserRouter, RouterProvider } from 'react-router-dom';
import { routes } from '@/router';
import DoodleLayout from '@/components/layouts/DoodleLayout';

const router = createBrowserRouter(routes);

function App() {
  return (
    <DoodleLayout>
      <RouterProvider router={router} />
    </DoodleLayout>
  );
}

export default App;
