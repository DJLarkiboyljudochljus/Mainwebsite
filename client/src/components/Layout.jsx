import { Link } from "react-router-dom";

const Layout = ({ children, title }) => {
  document.title = title === "" ? "" : title + " - " + "Dj Larkiboy Events";
  return (
    <div className="layout">
      <header>
        <h1>
          <img src="/favicon.ico" alt="Logo" /> {title}
        </h1>

        <nav>
          <ul>
            <li>
              <Link to="/">Home</Link>
            </li>
            <li>
              <Link to="/about">About</Link>
            </li>
            <li>
              <Link to="/contact">Contact</Link>
            </li>
          </ul>
        </nav>
      </header>
      <main>{children}</main>
      <footer>
        <p>
          &copy;{" "}
          {new Date().getFullYear() === 2025
            ? 2025
            : `2025 - ${new Date().getFullYear()}`}{" "}
          Dj Larkiboy Events
        </p>
      </footer>
    </div>
  );
};

export default Layout;
