// front/src/components/Layout.jsx
import RightSidebar from "./RightSidebar";
import Header from "./Header";
import Footer from "./Footer";

function Layout({ children }) {
  return (
    <div style={{ display: "flex" }}>
      <div style={{ flex: 1, marginRight: "250px" }}>
        <Header />
        {children}
        <Footer />
      </div>

      <RightSidebar />
    </div>
  );
}

export default Layout;
