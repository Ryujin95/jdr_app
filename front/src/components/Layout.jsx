// src/components/Layout.jsx
import Header from "./Header";
import Footer from "./Footer";

function Layout({ children }) {
  return (
    <div className="app">
      <Header />
      {children}
      <Footer />
    </div>
  );
}

export default Layout;