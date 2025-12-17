import "./HeaderFooter.css";

function Footer() {
  return (
    <footer className="footer">
      <p>© {new Date().getFullYear()} - JDR API Client</p>
    </footer>
  );
}

export default Footer;
