import { createBrowserRouter, RouterProvider } from 'react-router-dom';
import { routes } from '@/router';
import DoodleLayout from '@/components/layouts/DoodleLayout';
import { SocketProvider } from '@/contexts/SocketContext';

const router = createBrowserRouter(routes);

function App() {
  return (
    <SocketProvider>
      <DoodleLayout>
        <RouterProvider router={router} />
      </DoodleLayout>
    </SocketProvider>
  );
}

export default App;
