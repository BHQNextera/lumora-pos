function Header() {
  return (
    <header className="pos-header">
      <div className="pos-header__business">
        <div className="pos-header__business-logo" aria-hidden="true">
          CT
        </div>

        <div className="pos-header__business-copy">
          <strong>Coffee Time</strong>
          <span>סניף רחובות</span>
        </div>
      </div>

      <button type="button" className="pos-header__menu-button">
        תפריט
      </button>
    </header>
  );
}

export default Header;
