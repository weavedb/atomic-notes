import React from "react"
import { RouterProvider, createHashRouter } from "react-router-dom"
import { ChakraProvider } from "@chakra-ui/react"
import ReactDOM from "react-dom/client"
import App from "./App.jsx"
import Note from "./pages/Note"
import User from "./pages/User"
import CreateNote from "./pages/CreateNote"
import Book from "./pages/Book"
import CreateBook from "./pages/CreateBook"

const router = createHashRouter([
  {
    path: "/",
    element: <App />,
  },
  {
    path: "/u/:id",
    element: <User />,
  },
  {
    path: "/n/:id",
    element: <Note />,
  },
  {
    path: "/b/:id",
    element: <Book />,
  },
  {
    path: "/n/:pid/edit",
    element: <CreateNote />,
  },
  {
    path: "/b/:pid/edit",
    element: <CreateBook />,
  },
])

ReactDOM.createRoot(document.getElementById("root")).render(
  <React.StrictMode>
    <ChakraProvider>
      <RouterProvider router={router} />
    </ChakraProvider>
  </React.StrictMode>,
)
