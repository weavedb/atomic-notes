import React from "react"
import { RouterProvider, createHashRouter } from "react-router-dom"
import { ChakraProvider } from "@chakra-ui/react"
import ReactDOM from "react-dom/client"
import App from "./App.jsx"
import Article from "./pages/Article"
import Admin from "./pages/Admin"
import AtomicNote from "./pages/AtomicNote"

const router = createHashRouter([
  {
    path: "/",
    element: <App />,
  },
  {
    path: "/a/:id",
    element: <Article />,
  },
  {
    path: "/admin",
    element: <Admin />,
  },
  {
    path: "/atomic-note/:pid",
    element: <AtomicNote />,
  },
])

ReactDOM.createRoot(document.getElementById("root")).render(
  <React.StrictMode>
    <ChakraProvider>
      <RouterProvider router={router} />
    </ChakraProvider>
  </React.StrictMode>,
)
