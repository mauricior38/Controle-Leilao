import { createBrowserRouter } from "react-router-dom";

import EventosPage from "../features/eventos/pages/EventosPage";
import EventoDetalhePage from "../features/eventos/pages/EventoDetalhePage";
import Configuracoes from "../features/config/Configuracoes";

export const router = createBrowserRouter([
  {
    path: "/",
    element: <EventosPage />,
  },
  {
    path: "/eventos/:id",
    element: <EventoDetalhePage />,
  },

  {
    path: "/config",
    element: <Configuracoes />,
  },
]);
