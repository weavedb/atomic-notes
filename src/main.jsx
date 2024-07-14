import React from "react"
import { RouterProvider, createHashRouter } from "react-router-dom"
import { ChakraProvider } from "@chakra-ui/react"
import ReactDOM from "react-dom/client"
import App from "./App.jsx"
import Article from "./pages/Article"

const router = createHashRouter([
  {
    path: "/",
    element: <App />,
  },
  {
    path: "/a/:id",
    element: <Article />,
  },
])

ReactDOM.createRoot(document.getElementById("root")).render(
  <React.StrictMode>
    <ChakraProvider>
      <RouterProvider router={router} />
    </ChakraProvider>
  </React.StrictMode>,
)
