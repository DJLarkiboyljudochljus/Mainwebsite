import React from "react";
import { Routes, useLocation, Route as RRoute } from "react-router-dom";
import Home from "./pages/Home.jsx";
import { AnimatePresence } from "framer-motion";
import Route from "./components/Route.jsx";
import LanguageSwitcher from "./components/LanguageSwitcher.jsx";

const App = () => {
  const location = useLocation();

  return (
    <div className="App">
      <LanguageSwitcher />
      <AnimatePresence mode="wait">
        <Routes location={location} key={location.pathname}>
          <RRoute
            path="/"
            element={
              <Route title="Home">
                <Home />
              </Route>
            }
          />
          <RRoute
            path="/about"
            element={
              <Route title="About Us">
                <h1>About Us</h1>
                <p>We are dedicated to providing the best event experiences.</p>
              </Route>
            }
          />
          <RRoute
            path="/contact"
            element={
              <Route title="Contact Us">
                <h1>Contact Us</h1>
                <p>If you have any questions, feel free to reach out!</p>
              </Route>
            }
          />
        </Routes>
      </AnimatePresence>
    </div>
  );
};

export default App;
